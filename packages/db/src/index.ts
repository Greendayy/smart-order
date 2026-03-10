import postgres, { type Sql } from "postgres";

export type { Sql };

export function createSql(connectionString: string): Sql {
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });
}

export function sqlFromEnv(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  return createSql(connectionString);
}
