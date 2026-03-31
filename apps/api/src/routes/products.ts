import { Elysia, t } from "elysia";
import { dbPlugin } from "../db";

export const productsRoutes = new Elysia({ prefix: "/products" })
  .use(dbPlugin)

  // GET /products/sold-today
  .get("/sold-today", async ({ sql }) => {
    return sql`
      select distinct p.* from products p
      join sales_order_items soi on soi.product_id = p.id
      join sales_orders so on so.id = soi.sales_order_id
      where so.created_at >= current_date and so.created_at < current_date + 1
      order by p.name
    `;
  })

  // GET /products
  .get("/", async ({ sql, query }) => {
    const { search, category } = query;
    if (search && category) {
      return sql`select * from products where category = ${category}
        and (name ilike ${"%" + search + "%"} or note ilike ${"%" + search + "%"})
        order by created_at desc`;
    }
    if (search) {
      return sql`select * from products
        where name ilike ${"%" + search + "%"} or category ilike ${"%" + search + "%"} or note ilike ${"%" + search + "%"}
        order by created_at desc`;
    }
    if (category) {
      return sql`select * from products where category = ${category} order by created_at desc`;
    }
    return sql`select * from products order by created_at desc`;
  }, { query: t.Object({ search: t.Optional(t.String()), category: t.Optional(t.String()) }) })

  // POST /products
  .post("/", async ({ sql, body }) => {
    const rows = await sql`
      insert into products (name, category, unit, supplier_name, purchase_price_cents, price_cents, cost_cents, note, stock)
      values (${body.name}, ${body.category ?? null}, ${body.unit ?? "个"}, ${body.supplier_name ?? null},
              ${body.purchase_price_cents ?? 0}, ${body.price_cents ?? 0}, ${body.cost_cents ?? 0}, ${body.note ?? null}, ${body.stock ?? 0})
      returning *`;
    return rows[0];
  }, {
    body: t.Object({
      name: t.String(), category: t.Optional(t.String()), unit: t.Optional(t.String()),
      supplier_name: t.Optional(t.String()), purchase_price_cents: t.Optional(t.Number()),
      price_cents: t.Optional(t.Number()), cost_cents: t.Optional(t.Number()),
      note: t.Optional(t.String()), stock: t.Optional(t.Number())
    })
  })

  // GET /products/:id
  .get("/:id", async ({ sql, params, set }) => {
    const rows = await sql`select * from products where id = ${params.id}`;
    if (rows.length === 0) { set.status = 404; return { message: "Product not found" }; }
    return rows[0];
  }, { params: t.Object({ id: t.String() }) })

  // PUT /products/:id
  .put("/:id", async ({ sql, params, body, set }) => {
    const rows = await sql`
      update products set name=${body.name}, category=${body.category ?? null}, unit=${body.unit ?? "个"},
        supplier_name=${body.supplier_name ?? null}, purchase_price_cents=${body.purchase_price_cents ?? 0},
        price_cents=${body.price_cents ?? 0}, cost_cents=${body.cost_cents ?? 0},
        note=${body.note ?? null}, stock=${body.stock ?? 0}, updated_at=now()
      where id = ${params.id} returning *`;
    if (rows.length === 0) { set.status = 404; return { message: "Product not found" }; }
    return rows[0];
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.String(), category: t.Optional(t.String()), unit: t.Optional(t.String()),
      supplier_name: t.Optional(t.String()), purchase_price_cents: t.Optional(t.Number()),
      price_cents: t.Optional(t.Number()), cost_cents: t.Optional(t.Number()),
      note: t.Optional(t.String()), stock: t.Optional(t.Number())
    })
  })

  // DELETE /products/:id
  .delete("/:id", async ({ sql, params, set }) => {
    const rows = await sql`delete from products where id = ${params.id} returning id`;
    if (rows.length === 0) { set.status = 404; return { message: "Product not found" }; }
    return { success: true };
  }, { params: t.Object({ id: t.String() }) });
