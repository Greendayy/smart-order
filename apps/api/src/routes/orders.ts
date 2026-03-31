import { Elysia, t } from "elysia";
import { dbPlugin } from "../db";
import { generateOrderNumber } from "../lib/order-number";

type AnySql = {
  unsafe: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

const orderItemSchema = t.Object({
  product_id: t.Optional(t.String()),
  product_name: t.String(),
  quantity: t.Number(),
  unit_price_cents: t.Number(),
  unit: t.Optional(t.String()),
  category: t.Optional(t.String()),
  note: t.Optional(t.String())
});

const validStatuses = ["draft", "pending_ship", "shipped", "settled"] as const;

export const ordersRoutes = new Elysia({ prefix: "/orders" })
  .use(dbPlugin)

  // GET /orders/reconcile - summary for filtered orders
  .get("/reconcile", async ({ sql, query }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.customer_name) {
      conditions.push(`c.name ilike $${conditions.length + 1}`);
      params.push("%" + query.customer_name + "%");
    }
    if (query.order_type) {
      conditions.push(`so.order_type = $${conditions.length + 1}`);
      params.push(query.order_type);
    }
    if (query.start_date) {
      conditions.push(`so.created_at >= $${conditions.length + 1}`);
      params.push(query.start_date);
    }
    if (query.end_date) {
      conditions.push(`so.created_at < ($${conditions.length + 1})::date + 1`);
      params.push(query.end_date);
    }
    const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

    const rows = await sql.unsafe(`
      select
        c.id as customer_id, c.name as customer_name,
        count(so.id)::int as order_count,
        coalesce(sum(
          (select coalesce(sum(soi.line_total_cents), 0) from sales_order_items soi where soi.sales_order_id = so.id)
        ), 0)::int as total_cents,
        coalesce(sum(so.paid_amount_cents), 0)::int as paid_cents
      from sales_orders so
      join customers c on c.id = so.customer_id
      ${whereClause}
      group by c.id, c.name
      order by total_cents desc
    `, params as never[]);

    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      owed_cents: (r.total_cents as number) - (r.paid_cents as number)
    }));
  }, {
    query: t.Object({
      customer_name: t.Optional(t.String()),
      order_type: t.Optional(t.String()),
      start_date: t.Optional(t.String()),
      end_date: t.Optional(t.String())
    })
  })

  // POST /orders
  .post("/", async ({ sql, body, set }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await sql.begin(async (_tx: any) => {
      const tx = _tx as AnySql;

      let customerId = body.customer_id;
      if (!customerId && body.customer_name) {
        const existing = await tx.unsafe(`select id from customers where name = $1 limit 1`, [body.customer_name]);
        if (existing.length > 0 && existing[0]) {
          customerId = existing[0].id as string;
          // Update phone/address if provided
          if (body.customer_phone || body.customer_address) {
            await tx.unsafe(
              `update customers set phone=coalesce($1, phone), address=coalesce($2, address), updated_at=now() where id=$3`,
              [body.customer_phone ?? null, body.customer_address ?? null, customerId]
            );
          }
        } else {
          const created = await tx.unsafe(
            `insert into customers (name, phone, address) values ($1, $2, $3) returning id`,
            [body.customer_name, body.customer_phone ?? null, body.customer_address ?? null]
          );
          customerId = created[0]!.id as string;
        }
      }
      if (!customerId) { set.status = 400; return { message: "customer_id or customer_name is required" }; }

      const orderNo = await generateOrderNumber(tx);
      const orderRows = await tx.unsafe(
        `insert into sales_orders (customer_id, order_no, source, status, note, created_by, order_type, settlement_type)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
        [customerId, orderNo, body.source ?? "manual", body.status ?? "draft",
         body.note ?? null, body.created_by ?? null, body.order_type ?? "sale", body.settlement_type ?? "cash"]
      );
      const order = orderRows[0];

      const items = [];
      for (const item of body.items ?? []) {
        let productId = item.product_id ?? null;
        if (!productId && item.product_name) {
          const existing = await tx.unsafe(`select id from products where name = $1 limit 1`, [item.product_name]);
          if (existing.length > 0 && existing[0]) {
            productId = existing[0].id as string;
          } else {
            const created = await tx.unsafe(
              `insert into products (name, price_cents, unit, category) values ($1, $2, $3, $4) returning id`,
              [item.product_name, item.unit_price_cents, item.unit ?? "个", item.category ?? null]
            );
            productId = created[0]!.id as string;
          }
        }
        const lineTotalCents = item.quantity * item.unit_price_cents;
        const itemRows = await tx.unsafe(
          `insert into sales_order_items
            (sales_order_id, product_id, product_name, quantity, unit_price_cents, line_total_cents, note)
           values ($1, $2, $3, $4, $5, $6, $7) returning *`,
          [order!.id, productId, item.product_name, item.quantity, item.unit_price_cents, lineTotalCents, item.note ?? null]
        );
        items.push(itemRows[0]);
      }
      return { ...order, items };
    });
  }, {
    body: t.Object({
      customer_id: t.Optional(t.String()),
      customer_name: t.Optional(t.String()),
      customer_phone: t.Optional(t.String()),
      customer_address: t.Optional(t.String()),
      source: t.Optional(t.String()),
      status: t.Optional(t.String()),
      note: t.Optional(t.String()),
      created_by: t.Optional(t.String()),
      order_type: t.Optional(t.String()),
      settlement_type: t.Optional(t.String()),
      items: t.Optional(t.Array(orderItemSchema))
    })
  })

  // GET /orders - list (default today)
  .get("/", async ({ sql, query }) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push(`so.status = $${conditions.length + 1}`);
      params.push(query.status);
    }
    if (query.order_type) {
      conditions.push(`so.order_type = $${conditions.length + 1}`);
      params.push(query.order_type);
    }
    if (query.customer_name) {
      conditions.push(`c.name ilike $${conditions.length + 1}`);
      params.push("%" + query.customer_name + "%");
    }
    if (query.start_date) {
      conditions.push(`so.created_at >= $${conditions.length + 1}`);
      params.push(query.start_date);
    }
    if (query.end_date) {
      conditions.push(`so.created_at < ($${conditions.length + 1})::date + 1`);
      params.push(query.end_date);
    }

    // Default to today if no date filter
    if (!query.start_date && !query.end_date) {
      conditions.push(`so.created_at >= current_date`);
      conditions.push(`so.created_at < current_date + 1`);
    }

    const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

    return sql.unsafe(`
      select so.*, c.name as customer_name,
        coalesce((select sum(soi.line_total_cents) from sales_order_items soi where soi.sales_order_id = so.id), 0)::int as total_cents
      from sales_orders so
      left join customers c on c.id = so.customer_id
      ${whereClause}
      order by so.created_at desc
    `, params as never[]);
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      order_type: t.Optional(t.String()),
      customer_name: t.Optional(t.String()),
      start_date: t.Optional(t.String()),
      end_date: t.Optional(t.String())
    })
  })

  // GET /orders/:id
  .get("/:id", async ({ sql, params, set }) => {
    const orders = await sql`
      select so.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
      from sales_orders so left join customers c on c.id = so.customer_id
      where so.id = ${params.id}`;
    if (orders.length === 0) { set.status = 404; return { message: "Order not found" }; }

    const items = await sql`
      select soi.*, p.unit, p.category as product_category
      from sales_order_items soi left join products p on p.id = soi.product_id
      where soi.sales_order_id = ${params.id}`;

    return { ...orders[0], items };
  }, { params: t.Object({ id: t.String() }) })

  // PATCH /orders/:id/status
  .patch("/:id/status", async ({ sql, params, body, set }) => {
    if (!validStatuses.includes(body.status as typeof validStatuses[number])) {
      set.status = 400;
      return { message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` };
    }
    const rows = await sql`
      update sales_orders set status = ${body.status}, updated_at = now()
      where id = ${params.id} returning *`;
    if (rows.length === 0) { set.status = 404; return { message: "Order not found" }; }
    return rows[0];
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ status: t.String() })
  });
