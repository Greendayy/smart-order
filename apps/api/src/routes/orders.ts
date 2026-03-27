import { Elysia, t } from "elysia";
import { authMacro } from "../auth-macro";
import { pool } from "../db";
import { auditLog } from "../audit";

type OrderListRow = {
  id: string;
  customer_id: string;
  customer_name: string;
  status: string;
  note: string | null;
  total_cents: string;
  paid_cents: string;
  created_at: string;
};

type OrderDetailRow = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type PaymentRow = {
  id: string;
  amount_cents: number;
  method: string | null;
  note: string | null;
  created_at: string;
};

const ORDER_LIST_QUERY = `
  SELECT
    so.id, so.customer_id, c.name AS customer_name,
    so.status, so.note, so.created_at,
    COALESCE(SUM(soi.line_total_cents), 0)::integer AS total_cents,
    COALESCE((
      SELECT SUM(p.amount_cents) FROM payments p WHERE p.sales_order_id = so.id
    ), 0)::integer AS paid_cents
  FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id
  LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
`;

const itemBody = t.Object({
  product_id: t.Optional(t.String()),
  product_name: t.String({ minLength: 1 }),
  quantity: t.Number({ minimum: 1 }),
  unit_price_cents: t.Number({ minimum: 0 })
});

export const ordersRoute = new Elysia({ prefix: "/orders" })
  .use(authMacro)

  // List orders (optional ?status= filter)
  .get(
    "/",
    async ({ query }) => {
      const { status } = query;
      const where = status ? `WHERE so.status = $1` : "";
      const params = status ? [status] : [];
      const res = await pool.query<OrderListRow>(
        `${ORDER_LIST_QUERY}
         ${where}
         GROUP BY so.id, so.customer_id, c.name, so.status, so.note, so.created_at
         ORDER BY so.created_at DESC`,
        params
      );
      return res.rows.map((r) => ({
        ...r,
        total_cents: Number(r.total_cents),
        paid_cents: Number(r.paid_cents)
      }));
    },
    {
      auth: true,
      query: t.Object({ status: t.Optional(t.String()) })
    }
  )

  // Create order with items (transaction)
  .post(
    "/",
    async ({ body, set, user }) => {
      const { customer_id, note, items } = body;
      if (items.length === 0) {
        set.status = 400;
        return { error: "订单明细不能为空" };
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const orderRes = await client.query<{ id: string }>(
          `INSERT INTO sales_orders (customer_id, note) VALUES ($1, $2) RETURNING id`,
          [customer_id, note ?? null]
        );
        const orderId = orderRes.rows[0]!.id;
        for (const item of items) {
          const lineTotal = item.quantity * item.unit_price_cents;
          await client.query(
            `INSERT INTO sales_order_items
               (sales_order_id, product_id, product_name, quantity, unit_price_cents, line_total_cents)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              orderId,
              item.product_id ?? null,
              item.product_name,
              item.quantity,
              item.unit_price_cents,
              lineTotal
            ]
          );
        }
        await client.query("COMMIT");
        auditLog(user.id, "order.create", "order", orderId, { customer_id });
        return { id: orderId };
      } catch {
        await client.query("ROLLBACK");
        set.status = 500;
        return { error: "创建失败" };
      } finally {
        client.release();
      }
    },
    {
      auth: true,
      body: t.Object({
        customer_id: t.String(),
        note: t.Optional(t.String()),
        items: t.Array(itemBody, { minItems: 1 })
      })
    }
  )

  // Get order detail
  .get(
    "/:id",
    async ({ params, set }) => {
      const orderRes = await pool.query<OrderDetailRow>(
        `SELECT so.id, so.customer_id, c.name AS customer_name,
                c.phone AS customer_phone, c.address AS customer_address,
                so.status, so.note, so.created_at, so.updated_at
         FROM sales_orders so
         JOIN customers c ON c.id = so.customer_id
         WHERE so.id = $1`,
        [params.id]
      );
      if (!orderRes.rows[0]) { set.status = 404; return { error: "Not found" }; }

      const itemsRes = await pool.query<OrderItemRow>(
        `SELECT id, product_id, product_name, quantity, unit_price_cents, line_total_cents
         FROM sales_order_items WHERE sales_order_id = $1 ORDER BY id`,
        [params.id]
      );

      const paymentsRes = await pool.query<PaymentRow>(
        `SELECT id, amount_cents, method, note, created_at
         FROM payments WHERE sales_order_id = $1 ORDER BY created_at ASC`,
        [params.id]
      );

      const total_cents = itemsRes.rows.reduce((s, r) => s + r.line_total_cents, 0);
      const paid_cents = paymentsRes.rows.reduce((s, r) => s + r.amount_cents, 0);

      return {
        ...orderRes.rows[0],
        total_cents,
        paid_cents,
        items: itemsRes.rows,
        payments: paymentsRes.rows
      };
    },
    { auth: true }
  )

  // Update order status / note
  .put(
    "/:id",
    async ({ params, body, set, user }) => {
      const { status, note } = body;
      const res = await pool.query(
        `UPDATE sales_orders
         SET status = COALESCE($1, status),
             note   = COALESCE($2, note),
             updated_at = now()
         WHERE id = $3 RETURNING id`,
        [status ?? null, note ?? null, params.id]
      );
      if (!res.rows[0]) { set.status = 404; return { error: "Not found" }; }
      auditLog(user.id, "order.update", "order", params.id, { status, note });
      return { ok: true };
    },
    {
      auth: true,
      body: t.Object({
        status: t.Optional(t.String()),
        note: t.Optional(t.String())
      })
    }
  )

  // Delete order
  .delete(
    "/:id",
    async ({ params, set, user }) => {
      const res = await pool.query(
        `DELETE FROM sales_orders WHERE id = $1 RETURNING id`,
        [params.id]
      );
      if (!res.rows[0]) { set.status = 404; return { error: "Not found" }; }
      auditLog(user.id, "order.delete", "order", params.id);
      return { ok: true };
    },
    { auth: true }
  )

  // Add payment
  .post(
    "/:id/payments",
    async ({ params, body, set, user }) => {
      const order = await pool.query(
        `SELECT id FROM sales_orders WHERE id = $1`, [params.id]
      );
      if (!order.rows[0]) { set.status = 404; return { error: "Not found" }; }
      const res = await pool.query<{ id: string }>(
        `INSERT INTO payments (sales_order_id, amount_cents, method, note)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [params.id, body.amount_cents, body.method ?? null, body.note ?? null]
      );
      const payId = res.rows[0]!.id;
      auditLog(user.id, "payment.create", "payment", payId, { sales_order_id: params.id, amount_cents: body.amount_cents });
      return { id: payId };
    },
    {
      auth: true,
      body: t.Object({
        amount_cents: t.Number({ minimum: 1 }),
        method: t.Optional(t.String()),
        note: t.Optional(t.String())
      })
    }
  )

  // Delete payment
  .delete(
    "/:id/payments/:pid",
    async ({ params, set, user }) => {
      const res = await pool.query(
        `DELETE FROM payments WHERE id = $1 AND sales_order_id = $2 RETURNING id`,
        [params.pid, params.id]
      );
      if (!res.rows[0]) { set.status = 404; return { error: "Not found" }; }
      auditLog(user.id, "payment.delete", "payment", params.pid, { sales_order_id: params.id });
      return { ok: true };
    },
    { auth: true }
  );
