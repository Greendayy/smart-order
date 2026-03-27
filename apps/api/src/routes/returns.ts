import { Elysia, t } from "elysia";
import { authMacro } from "../auth-macro";
import { pool } from "../db";
import { auditLog } from "../audit";

type ReturnListRow = {
  id: string;
  sales_order_id: string;
  customer_name: string;
  reason: string | null;
  method: string | null;
  total_cents: number;
  created_at: string;
};

type ReturnDetailRow = {
  id: string;
  sales_order_id: string;
  customer_name: string;
  reason: string | null;
  method: string | null;
  total_cents: number;
  created_at: string;
};

type ReturnItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

const returnItemBody = t.Object({
  product_id: t.Optional(t.String()),
  product_name: t.String({ minLength: 1 }),
  quantity: t.Number({ minimum: 1 }),
  unit_price_cents: t.Number({ minimum: 0 })
});

export const returnsRoute = new Elysia({ prefix: "/returns" })
  .use(authMacro)

  // List returns (optional ?order_id= filter)
  .get(
    "/",
    async ({ query }) => {
      const { order_id } = query;
      const where = order_id ? "WHERE r.sales_order_id = $1" : "";
      const params = order_id ? [order_id] : [];
      const res = await pool.query<ReturnListRow>(
        `SELECT r.id, r.sales_order_id, c.name AS customer_name,
                r.reason, r.method, r.total_cents, r.created_at
         FROM returns r
         JOIN sales_orders so ON so.id = r.sales_order_id
         JOIN customers c ON c.id = so.customer_id
         ${where}
         ORDER BY r.created_at DESC`,
        params
      );
      return res.rows;
    },
    {
      auth: true,
      query: t.Object({ order_id: t.Optional(t.String()) })
    }
  )

  // Create return with items (transaction)
  .post(
    "/",
    async ({ body, set, user }) => {
      const { sales_order_id, reason, method, items } = body;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Verify order exists
        const orderCheck = await client.query(
          `SELECT id FROM sales_orders WHERE id = $1`, [sales_order_id]
        );
        if (!orderCheck.rows[0]) {
          await client.query("ROLLBACK");
          set.status = 404;
          return { error: "订单不存在" };
        }

        const total_cents = items.reduce(
          (s, it) => s + it.quantity * it.unit_price_cents, 0
        );

        const returnRes = await client.query<{ id: string }>(
          `INSERT INTO returns (sales_order_id, reason, method, total_cents)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [sales_order_id, reason ?? null, method ?? null, total_cents]
        );
        const returnId = returnRes.rows[0]!.id;

        for (const item of items) {
          const lineTotal = item.quantity * item.unit_price_cents;
          await client.query(
            `INSERT INTO return_items
               (return_id, product_id, product_name, quantity, unit_price_cents, line_total_cents)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              returnId,
              item.product_id ?? null,
              item.product_name,
              item.quantity,
              item.unit_price_cents,
              lineTotal
            ]
          );
        }

        await client.query("COMMIT");
        auditLog(user.id, "return.create", "return", returnId, { sales_order_id, total_cents });
        return { id: returnId };
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
        sales_order_id: t.String(),
        reason: t.Optional(t.String()),
        method: t.Optional(t.String()),
        items: t.Array(returnItemBody, { minItems: 1 })
      })
    }
  )

  // Get return detail
  .get(
    "/:id",
    async ({ params, set }) => {
      const returnRes = await pool.query<ReturnDetailRow>(
        `SELECT r.id, r.sales_order_id, c.name AS customer_name,
                r.reason, r.method, r.total_cents, r.created_at
         FROM returns r
         JOIN sales_orders so ON so.id = r.sales_order_id
         JOIN customers c ON c.id = so.customer_id
         WHERE r.id = $1`,
        [params.id]
      );
      if (!returnRes.rows[0]) { set.status = 404; return { error: "Not found" }; }

      const itemsRes = await pool.query<ReturnItemRow>(
        `SELECT id, product_id, product_name, quantity, unit_price_cents, line_total_cents
         FROM return_items WHERE return_id = $1 ORDER BY id`,
        [params.id]
      );

      return { ...returnRes.rows[0], items: itemsRes.rows };
    },
    { auth: true }
  )

  // Delete return
  .delete(
    "/:id",
    async ({ params, set, user }) => {
      const res = await pool.query(
        `DELETE FROM returns WHERE id = $1 RETURNING id`, [params.id]
      );
      if (!res.rows[0]) { set.status = 404; return { error: "Not found" }; }
      auditLog(user.id, "return.delete", "return", params.id);
      return { ok: true };
    },
    { auth: true }
  );
