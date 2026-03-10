import { describe, expect, test } from "bun:test";
import { createSql } from "./index";

describe("@smart-order/db", () => {
  test("createSql returns a sql client", () => {
    const sql = createSql("postgres://smart:smart@localhost:5432/smart_order");
    expect(typeof sql).toBe("function");
  });
});

