import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./auth";
import { authMacro } from "./auth-macro";
import { pool } from "./db";
import { env } from "./env";
import { customersRoute } from "./routes/customers";
import { productsRoute } from "./routes/products";
import { ordersRoute } from "./routes/orders";
import { returnsRoute } from "./routes/returns";
import { settingsRoute } from "./routes/settings";
import { statsRoute } from "./routes/stats";
import { auditLogsRoute } from "./routes/audit-logs";
import { authCodeRoute } from "./routes/auth-code";
import { auditLog } from "./audit";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
};

const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .use(authMacro);

export const app = new Elysia()
  .use(
    cors({
      origin: env.webOrigins,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    })
  )
  .use(betterAuthPlugin)
  .get(
    "/health",
    () => ({
      ok: true,
      time: new Date().toISOString()
    }),
    {
      response: t.Object({
        ok: t.Boolean(),
        time: t.String()
      })
    }
  )
  .get("/me", ({ user }) => user, { auth: true })
  .use(customersRoute)
  .use(productsRoute)
  .use(ordersRoute)
  .use(returnsRoute)
  .use(settingsRoute)
  .use(statsRoute)
  .use(auditLogsRoute)
  .use(authCodeRoute)
  .get(
    "/users",
    async ({ user, set }) => {
      if ((user as { role?: string }).role !== "admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      const result = await pool.query<UserRow>(
        `SELECT id, name, email, role, banned, "createdAt" FROM "user" ORDER BY "createdAt" ASC`
      );
      return result.rows;
    },
    { auth: true }
  )
  .put(
    "/users/:id/role",
    async ({ user, set, params, body }) => {
      if ((user as { role?: string }).role !== "admin") {
        set.status = 403;
        return { error: "Forbidden" };
      }
      await pool.query(`UPDATE "user" SET role = $1, "updatedAt" = now() WHERE id = $2`, [
        body.role,
        params.id
      ]);
      auditLog(user.id, "user.role_change", "user", params.id, { new_role: body.role });
      return { ok: true };
    },
    {
      auth: true,
      body: t.Object({ role: t.Union([t.Literal("admin"), t.Literal("sales")]) })
    }
  )
  ;
