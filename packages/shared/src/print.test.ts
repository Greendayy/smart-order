import { describe, expect, test } from "bun:test";
import { paginateRows } from "./print";

describe("paginateRows", () => {
  test("paginates into fixed-size pages", () => {
    const rows = Array.from({ length: 21 }, (_, i) => i + 1);
    const pages = paginateRows(rows, 20);
    expect(pages.length).toBe(2);
    expect(pages[0]?.length).toBe(20);
    expect(pages[1]?.length).toBe(1);
    expect(pages[1]?.[0]).toBe(21);
  });
});

