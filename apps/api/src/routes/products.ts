import { Elysia, t } from "elysia";
import { dbPlugin } from "../db";

export const productsRoutes = new Elysia({ prefix: "/products" })
  .use(dbPlugin)

  // GET /products - list with optional search
  .get(
    "/",
    async ({ sql, query }) => {
      const { search } = query;
      if (search) {
        return sql`
          select * from products
          where name ilike ${"%" + search + "%"}
             or oe_code ilike ${"%" + search + "%"}
             or barcode ilike ${"%" + search + "%"}
          order by created_at desc
        `;
      }
      return sql`select * from products order by created_at desc`;
    },
    { query: t.Object({ search: t.Optional(t.String()) }) }
  )

  // POST /products - create
  .post(
    "/",
    async ({ sql, body }) => {
      const rows = await sql`
        insert into products (name, barcode, spec, image_url, cost_cents, price_cents, stock, category, oe_code, unit)
        values (
          ${body.name},
          ${body.barcode ?? null},
          ${body.spec ?? null},
          ${body.image_url ?? null},
          ${body.cost_cents ?? 0},
          ${body.price_cents ?? 0},
          ${body.stock ?? 0},
          ${body.category ?? null},
          ${body.oe_code ?? null},
          ${body.unit ?? "个"}
        )
        returning *
      `;
      return rows[0];
    },
    {
      body: t.Object({
        name: t.String(),
        barcode: t.Optional(t.String()),
        spec: t.Optional(t.String()),
        image_url: t.Optional(t.String()),
        cost_cents: t.Optional(t.Number()),
        price_cents: t.Optional(t.Number()),
        stock: t.Optional(t.Number()),
        category: t.Optional(t.String()),
        oe_code: t.Optional(t.String()),
        unit: t.Optional(t.String())
      })
    }
  )

  // GET /products/:id - detail
  .get(
    "/:id",
    async ({ sql, params, set }) => {
      const rows = await sql`select * from products where id = ${params.id}`;
      if (rows.length === 0) { set.status = 404; return { message: "Product not found" }; }
      return rows[0];
    },
    { params: t.Object({ id: t.String() }) }
  )

  // PUT /products/:id - update
  .put(
    "/:id",
    async ({ sql, params, body, set }) => {
      const rows = await sql`
        update products set
          name = ${body.name},
          barcode = ${body.barcode ?? null},
          spec = ${body.spec ?? null},
          image_url = ${body.image_url ?? null},
          cost_cents = ${body.cost_cents ?? 0},
          price_cents = ${body.price_cents ?? 0},
          stock = ${body.stock ?? 0},
          category = ${body.category ?? null},
          oe_code = ${body.oe_code ?? null},
          unit = ${body.unit ?? "个"},
          updated_at = now()
        where id = ${params.id}
        returning *
      `;
      if (rows.length === 0) { set.status = 404; return { message: "Product not found" }; }
      return rows[0];
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String(),
        barcode: t.Optional(t.String()),
        spec: t.Optional(t.String()),
        image_url: t.Optional(t.String()),
        cost_cents: t.Optional(t.Number()),
        price_cents: t.Optional(t.Number()),
        stock: t.Optional(t.Number()),
        category: t.Optional(t.String()),
        oe_code: t.Optional(t.String()),
        unit: t.Optional(t.String())
      })
    }
  )

  // DELETE /products/:id
  .delete(
    "/:id",
    async ({ sql, params, set }) => {
      const rows = await sql`delete from products where id = ${params.id} returning id`;
      if (rows.length === 0) { set.status = 404; return { message: "Product not found" }; }
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) }
  );
