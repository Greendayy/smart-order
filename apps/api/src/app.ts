import { Elysia, t } from "elysia";
import { auth } from "./auth";
import { productsRoutes } from "./routes/products";
import { customersRoutes } from "./routes/customers";
import { ordersRoutes } from "./routes/orders";

const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return status(401);

        return {
          user: session.user,
          session: session.session
        };
      }
    }
  });

export const app = new Elysia()
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
  .use(productsRoutes)
  .use(customersRoutes)
  .use(ordersRoutes)
  ;
