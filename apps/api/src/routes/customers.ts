import { Elysia, t } from "elysia";
import { dbPlugin } from "../db";

export const customersRoutes = new Elysia({ prefix: "/customers" })
  .use(dbPlugin)

  // GET /customers
  .get("/", async ({ sql, query }) => {
    const { search, sort_by } = query;
    const orderClause = sort_by === "balance" ? "order by balance_cents desc" : "order by created_at desc";
    if (search) {
      return sql.unsafe(`
        select * from customers
        where name ilike $1 or phone ilike $1
        ${orderClause}
      `, ["%" + search + "%"]) as never;
    }
    return sql.unsafe(`select * from customers ${orderClause}`) as never;
  }, { query: t.Object({ search: t.Optional(t.String()), sort_by: t.Optional(t.String()) }) })

  // POST /customers
  .post("/", async ({ sql, body }) => {
    const rows = await sql`
      insert into customers (name, phone, email, address, balance_cents)
      values (${body.name}, ${body.phone ?? null}, ${body.email ?? null}, ${body.address ?? null}, ${body.balance_cents ?? 0})
      returning *`;
    return rows[0];
  }, {
    body: t.Object({
      name: t.String(), phone: t.Optional(t.String()), email: t.Optional(t.String()),
      address: t.Optional(t.String()), balance_cents: t.Optional(t.Number())
    })
  })

  // GET /customers/:id
  .get("/:id", async ({ sql, params, set }) => {
    const rows = await sql`select * from customers where id = ${params.id}`;
    if (rows.length === 0) { set.status = 404; return { message: "Customer not found" }; }
    return rows[0];
  }, { params: t.Object({ id: t.String() }) })

  // PUT /customers/:id
  .put("/:id", async ({ sql, params, body, set }) => {
    const rows = await sql`
      update customers set name=${body.name}, phone=${body.phone ?? null}, email=${body.email ?? null},
        address=${body.address ?? null}, balance_cents=${body.balance_cents ?? 0}, updated_at=now()
      where id = ${params.id} returning *`;
    if (rows.length === 0) { set.status = 404; return { message: "Customer not found" }; }
    return rows[0];
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.String(), phone: t.Optional(t.String()), email: t.Optional(t.String()),
      address: t.Optional(t.String()), balance_cents: t.Optional(t.Number())
    })
  })

  // DELETE /customers/:id
  .delete("/:id", async ({ sql, params, set }) => {
    const rows = await sql`delete from customers where id = ${params.id} returning id`;
    if (rows.length === 0) { set.status = 404; return { message: "Customer not found" }; }
    return { success: true };
  }, { params: t.Object({ id: t.String() }) });
