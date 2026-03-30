import { Elysia, t } from "elysia";
import { dbPlugin } from "../db";
import { generateOrderNumber } from "../lib/order-number";

type AnySql = {
  unsafe: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

export const wechatMessagesRoutes = new Elysia({ prefix: "/wechat-messages" })
  .use(dbPlugin)

  // POST /wechat-messages - record a message
  .post(
    "/",
    async ({ sql, body }) => {
      const rows = await sql`
        insert into wechat_messages (sender_name, content, source)
        values (${body.sender_name}, ${body.content}, ${body.source ?? "manual"})
        returning *
      `;
      return rows[0];
    },
    {
      body: t.Object({
        sender_name: t.String(),
        content: t.String(),
        source: t.Optional(t.String())
      })
    }
  )

  // GET /wechat-messages/pending - list unprocessed messages
  .get(
    "/pending",
    async ({ sql }) => {
      return sql`
        select * from wechat_messages
        where status = 'pending'
        order by created_at desc
      `;
    }
  )

  // POST /wechat-messages/:id/convert - convert message to order
  .post(
    "/:id/convert",
    async ({ sql, params, body, set }) => {
      const msgs = await sql`select * from wechat_messages where id = ${params.id}`;
      if (msgs.length === 0) { set.status = 404; return { message: "Message not found" }; }

      const msg = msgs[0]!;
      if (msg.status !== "pending") { set.status = 400; return { message: "Message already processed" }; }

      // Create order via transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await sql.begin(async (_tx: any) => {
        const tx = _tx as AnySql;

        // Resolve or create customer from sender_name
        let customerId: string;
        const existing = await tx.unsafe(
          `select id from customers where name = $1 limit 1`,
          [msg.sender_name]
        );
        if (existing.length > 0 && existing[0]) {
          customerId = existing[0].id as string;
        } else {
          const created = await tx.unsafe(
            `insert into customers (name) values ($1) returning id`,
            [msg.sender_name]
          );
          customerId = created[0]!.id as string;
        }

        const orderNo = await generateOrderNumber(tx);

        const orderRows = await tx.unsafe(
          `insert into sales_orders (customer_id, order_no, source, status, note)
           values ($1, $2, 'wechat', 'pending', $3) returning *`,
          [customerId, orderNo, `来自微信消息: ${(msg.content as string).slice(0, 100)}`]
        );

        // Parse items from body if provided
        const items = [];
        for (const item of body.items ?? []) {
          const lineTotalCents = item.quantity * item.unit_price_cents;
          const itemRows = await tx.unsafe(
            `insert into sales_order_items
              (sales_order_id, product_name, quantity, unit_price_cents, line_total_cents)
             values ($1, $2, $3, $4, $5) returning *`,
            [orderRows[0]!.id, item.product_name, item.quantity, item.unit_price_cents, lineTotalCents]
          );
          items.push(itemRows[0]);
        }

        // Mark message as converted
        await tx.unsafe(
          `update wechat_messages set status = 'converted', sales_order_id = $1, updated_at = now() where id = $2`,
          [orderRows[0]!.id, params.id]
        );

        return { ...orderRows[0], items };
      });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        items: t.Optional(t.Array(t.Object({
          product_name: t.String(),
          quantity: t.Number(),
          unit_price_cents: t.Number()
        })))
      })
    }
  );
