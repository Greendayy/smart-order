import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { pool } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  database: pool,
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    admin({
      defaultRole: "sales",
      adminRole: "admin"
    })
  ],
  trustedOrigins: env.webOrigins
});

