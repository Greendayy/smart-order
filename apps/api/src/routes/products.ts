import { Elysia, t } from "elysia";
import { authMacro } from "../auth-macro";
import { pool } from "../db";
import { auditLog } from "../audit";

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  spec: string | null;
  image_url: string | null;
  cost_cents: number;
  price_cents: number;
  stock: number;
  stock_alert: number;
  created_at: string;
};

const productBody = t.Object({
  name: t.String({ minLength: 1 }),
  barcode: t.Optional(t.String()),
  spec: t.Optional(t.String()),
  image_url: t.Optional(t.String()),
  cost_cents: t.Number({ minimum: 0 }),
  price_cents: t.Number({ minimum: 0 }),
  stock: t.Number({ minimum: 0 }),
  stock_alert: t.Optional(t.Number({ minimum: 0 }))
});

export const productsRoute = new Elysia({ prefix: "/products" })
  .use(authMacro)

  // List all products
  .get(
    "/",
    async () => {
      const res = await pool.query<ProductRow>(
        `SELECT id, name, barcode, spec, image_url,
                cost_cents, price_cents, stock, stock_alert, created_at
         FROM products
         ORDER BY created_at DESC`
      );
      return res.rows;
    },
    { auth: true }
  )

  // Create product
  .post(
    "/",
    async ({ body, user }) => {
      const res = await pool.query<{ id: string }>(
        `INSERT INTO products (name, barcode, spec, image_url, cost_cents, price_cents, stock, stock_alert)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          body.name,
          body.barcode ?? null,
          body.spec ?? null,
          body.image_url ?? null,
          body.cost_cents,
          body.price_cents,
          body.stock,
          body.stock_alert ?? 10
        ]
      );
      const id = res.rows[0]!.id;
      auditLog(user.id, "product.create", "product", id, { name: body.name });
      return { id };
    },
    { auth: true, body: productBody }
  )

  // Get product by id
  .get(
    "/:id",
    async ({ params, set }) => {
      const res = await pool.query<ProductRow>(
        `SELECT id, name, barcode, spec, image_url,
                cost_cents, price_cents, stock, stock_alert, created_at
         FROM products WHERE id = $1`,
        [params.id]
      );
      if (!res.rows[0]) { set.status = 404; return { error: "Not found" }; }
      return res.rows[0];
    },
    { auth: true }
  )

  // Update product
  .put(
    "/:id",
    async ({ params, body, set, user }) => {
      const res = await pool.query(
        `UPDATE products
         SET name=$1, barcode=$2, spec=$3, image_url=$4,
             cost_cents=$5, price_cents=$6, stock=$7, stock_alert=$8, updated_at=now()
         WHERE id=$9 RETURNING id`,
        [
          body.name,
          body.barcode ?? null,
          body.spec ?? null,
          body.image_url ?? null,
          body.cost_cents,
          body.price_cents,
          body.stock,
          body.stock_alert ?? 10,
          params.id
        ]
      );
      if (!res.rows[0]) { set.status = 404; return { error: "Not found" }; }
      auditLog(user.id, "product.update", "product", params.id, { name: body.name });
      return { ok: true };
    },
    { auth: true, body: productBody }
  )

  // Delete product
  .delete(
    "/:id",
    async ({ params, set, user }) => {
      const res = await pool.query(
        `DELETE FROM products WHERE id=$1 RETURNING id`,
        [params.id]
      );
      if (!res.rows[0]) { set.status = 404; return { error: "Not found" }; }
      auditLog(user.id, "product.delete", "product", params.id);
      return { ok: true };
    },
    { auth: true }
  );
