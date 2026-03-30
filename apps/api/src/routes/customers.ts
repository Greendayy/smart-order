import { Elysia, t } from "elysia";
import { dbPlugin } from "../db";

export const customersRoutes = new Elysia({ prefix: "/customers" })
  .use(dbPlugin)

  // GET /customers - list with optional search
  .get(
    "/",
    async ({ sql, query }) => {
      const { search } = query;
      if (search) {
        return sql`
          select * from customers
          where name ilike ${"%" + search + "%"}
             or phone ilike ${"%" + search + "%"}
          order by created_at desc
        `;
      }
      return sql`select * from customers order by created_at desc`;
    },
    { query: t.Object({ search: t.Optional(t.String()) }) }
  )

  // POST /customers - create
  .post(
    "/",
    async ({ sql, body }) => {
      const rows = await sql`
        insert into customers (name, phone, email, address)
        values (${body.name}, ${body.phone ?? null}, ${body.email ?? null}, ${body.address ?? null})
        returning *
      `;
      return rows[0];
    },
    {
      body: t.Object({
        name: t.String(),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        address: t.Optional(t.String())
      })
    }
  )

  // GET /customers/:id - detail
  .get(
    "/:id",
    async ({ sql, params, set }) => {
      const rows = await sql`select * from customers where id = ${params.id}`;
      if (rows.length === 0) { set.status = 404; return { message: "Customer not found" }; }
      return rows[0];
    },
    { params: t.Object({ id: t.String() }) }
  )

  // PUT /customers/:id - update
  .put(
    "/:id",
    async ({ sql, params, body, set }) => {
      const rows = await sql`
        update customers set
          name = ${body.name},
          phone = ${body.phone ?? null},
          email = ${body.email ?? null},
          address = ${body.address ?? null},
          updated_at = now()
        where id = ${params.id}
        returning *
      `;
      if (rows.length === 0) { set.status = 404; return { message: "Customer not found" }; }
      return rows[0];
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String(),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
        address: t.Optional(t.String())
      })
    }
  )

  // DELETE /customers/:id
  .delete(
    "/:id",
    async ({ sql, params, set }) => {
      const rows = await sql`delete from customers where id = ${params.id} returning id`;
      if (rows.length === 0) { set.status = 404; return { message: "Customer not found" }; }
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) }
  );
