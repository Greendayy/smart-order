export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://smart:smart@localhost:5432/smart_order",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me",
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.API_PORT ?? "3001"}`,
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  port: Number(process.env.API_PORT ?? "3001")
};
