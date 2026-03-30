import { Elysia } from "elysia";
import { sqlFromEnv } from "@smart-order/db";

const sql = sqlFromEnv();

export const dbPlugin = new Elysia({ name: "db" }).decorate("sql", sql);
