import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlFromEnv } from "./index";

type Migration = {
  id: string;
  filename: string;
  sql: string;
};

function currentDir(): string {
  const self = fileURLToPath(import.meta.url);
  return join(self, "..");
}

async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = join(currentDir(), "..", "migrations");
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const migrations: Migration[] = [];

  for (const filename of files) {
    const id = filename.replace(/\.sql$/, "");
    const sql = await readFile(join(migrationsDir, filename), "utf8");
    migrations.push({ id, filename, sql });
  }
  return migrations;
}

async function ensureSchemaMigrations(sql: ReturnType<typeof sqlFromEnv>) {
  await sql.unsafe(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function appliedMigrationIds(sql: ReturnType<typeof sqlFromEnv>): Promise<Set<string>> {
  const rows = await sql<{ id: string }[]>`select id from schema_migrations order by applied_at asc`;
  return new Set(rows.map((r) => r.id));
}

async function applyMigration(sql: ReturnType<typeof sqlFromEnv>, migration: Migration) {
  await sql.begin(async (tx) => {
    await tx.unsafe(migration.sql);
    await tx.unsafe("insert into schema_migrations (id) values ($1)", [migration.id]);
  });
}

async function main() {
  const sql = sqlFromEnv();
  try {
    await ensureSchemaMigrations(sql);
    const migrations = await loadMigrations();
    const applied = await appliedMigrationIds(sql);

    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      // eslint-disable-next-line no-console
      console.log(`Applying migration: ${migration.filename}`);
      await applyMigration(sql, migration);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

await main();
