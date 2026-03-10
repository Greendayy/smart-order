import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  database: new Pool({
    connectionString: env.databaseUrl
  }),
  emailAndPassword: {
    enabled: true
  }
});

