import { Elysia, t } from "elysia";
import { authMacro } from "../auth-macro";
import { pool } from "../db";
import { auditLog } from "../audit";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  receivable_cents: string;
  created_at: string;
};

type OrderRow = {
  id: string;
  status: string;
  note: string | null;
  total_cents: string;
  paid_cents: string;
  created_at: string;
};

const CUSTOMER_WITH_RECEIVABLE = `
  SELECT
    c.id, c.name, c.phone, c.email, c.address, c.created_at,
    (
      COALESCE((
        SELECT SUM(soi.line_total_cents)
        FROM sales_orders so
        JOIN sales_order_items soi ON soi.sales_order_id = so.id
        WHERE so.customer_id = c.id AND so.status != 'canceled'
      ), 0)
      - COALESCE((
        SELECT SUM(p.amount_cents)
        FROM sales_orders so
        JOIN payments p ON p.sales_order_id = so.id
        WHERE so.customer_id = c.id AND so.status != 'canceled'
      ), 0)
    )::integer AS receivable_cents
  FROM customers c
`;

function parseCustomer(r: CustomerRow) {
  return { ...r, receivable_cents: Number(r.receivable_cents) };
}

export const customersRoute = new Elysia({ prefix: "/customers" })
  .use(authMacro)

  // List all customers
  .get(
    "/",
    async () => {
      const res = await pool.query<CustomerRow>(
        `${CUSTOMER_WITH_RECEIVABLE} ORDER BY c.created_at DESC`
      );
      return res.rows.map(parseCustomer);
    },
    { auth: true }
  )

  // Create customer
  .post(
    "/",
    async ({ body, user }) => {
      const { name, phone, email, address } = body;
      const res = await pool.query<{ id: string }>(
        `INSERT INTO customers (name, phone, email, address)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, phone ?? null, email ?? null, address ?? null]
      );
      const id = res.rows[0]!.id;
      auditLog(user.id, "customer.create", "customer", id, { name });
      return { id };
    },
    {
      auth: true,
      body: t.Object({
        name: t.String({ minLength: 1 }),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        address: t.Optional(t.String())
      })
    }
  )

  // Get customer detail + orders
  .get(
    "/:id",
    async ({ params, set }) => {
      const cRes = await pool.query<CustomerRow>(
        `${CUSTOMER_WITH_RECEIVABLE} WHERE c.id = $1`,
        [params.id]
      );
      if (!cRes.rows[0]) {
        set.status = 404;
        return { error: "Not found" };
      }

      const oRes = await pool.query<OrderRow>(
        `SELECT
           so.id, so.status, so.note, so.created_at,
           COALESCE(SUM(soi.line_total_cents), 0)::integer AS total_cents,
           COALESCE((
             SELECT SUM(p.amount_cents) FROM payments p WHERE p.sales_order_id = so.id
           ), 0)::integer AS paid_cents
         FROM sales_orders so
         LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
         WHERE so.customer_id = $1
         GROUP BY so.id, so.status, so.note, so.created_at
         ORDER BY so.created_at DESC`,
        [params.id]
      );

      return {
        ...parseCustomer(cRes.rows[0]),
        orders: oRes.rows.map((o) => ({
          ...o,
          total_cents: Number(o.total_cents),
          paid_cents: Number(o.paid_cents)
        }))
      };
    },
    { auth: true }
  )

  // Update customer
  .put(
    "/:id",
    async ({ params, body, set, user }) => {
      const { name, phone, email, address } = body;
      const res = await pool.query(
        `UPDATE customers
         SET name = $1, phone = $2, email = $3, address = $4, updated_at = now()
         WHERE id = $5 RETURNING id`,
        [name, phone ?? null, email ?? null, address ?? null, params.id]
      );
      if (!res.rows[0]) {
        set.status = 404;
        return { error: "Not found" };
      }
      auditLog(user.id, "customer.update", "customer", params.id, { name });
      return { ok: true };
    },
    {
      auth: true,
      body: t.Object({
        name: t.String({ minLength: 1 }),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        address: t.Optional(t.String())
      })
    }
  )

  // Delete customer
  .delete(
    "/:id",
    async ({ params, set, user }) => {
      const res = await pool.query(
        `DELETE FROM customers WHERE id = $1 RETURNING id`,
        [params.id]
      );
      if (!res.rows[0]) {
        set.status = 404;
        return { error: "Not found" };
      }
      auditLog(user.id, "customer.delete", "customer", params.id);
      return { ok: true };
    },
    { auth: true }
  );
