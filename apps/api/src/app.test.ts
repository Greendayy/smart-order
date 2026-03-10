import { describe, expect, test } from "bun:test";
import { app } from "./app";

describe("api /health", () => {
  test("returns ok", async () => {
    const response = await app.handle(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(typeof json.time).toBe("string");
  });
});

