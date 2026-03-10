import { describe, expect, test } from "bun:test";
import { providerFromEnv } from "./providers/openai-compatible";

describe("@smart-order/llm", () => {
  test("providerFromEnv returns null by default", () => {
    expect(providerFromEnv()).toBeNull();
  });
});

