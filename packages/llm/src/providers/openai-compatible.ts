import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatInput, ChatOutput, LlmProvider } from "../llm";

function getProviderName(): string {
  return process.env.LLM_PROVIDER ?? "";
}

function openAiModel(modelId: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for LLM_PROVIDER=openai");
  const provider = createOpenAI({
    apiKey,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {})
  });
  return provider(modelId);
}

function openAiCompatibleModel(name: string, apiKey: string, baseURL: string, modelId: string) {
  const provider = createOpenAICompatible({
    name,
    apiKey,
    baseURL
  });
  return provider.chatModel(modelId);
}

export function providerFromEnv(): LlmProvider | null {
  const enabled = (process.env.LLM_ENABLED ?? "").toLowerCase();
  if (enabled === "false" || enabled === "0" || enabled === "off") return null;

  const provider = getProviderName();
  if (!provider) return null;

  return {
    async chat(input: ChatInput): Promise<ChatOutput> {
      const model =
        provider === "openai"
          ? openAiModel(input.model)
          : provider === "kimi"
            ? (() => {
                const apiKey = process.env.KIMI_API_KEY;
                if (!apiKey) throw new Error("KIMI_API_KEY is required for LLM_PROVIDER=kimi");
                const baseURL = process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1";
                return openAiCompatibleModel("kimi", apiKey, baseURL, input.model);
              })()
            : provider === "qwen"
              ? (() => {
                  const apiKey = process.env.QWEN_API_KEY;
                  if (!apiKey) throw new Error("QWEN_API_KEY is required for LLM_PROVIDER=qwen");
                  const baseURL =
                    process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
                  return openAiCompatibleModel("qwen", apiKey, baseURL, input.model);
                })()
              : (() => {
                  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
                })();

      if (input.stream) {
        const result = streamText({
          model,
          messages: input.messages,
          temperature: input.temperature ?? 0.2
        });
        return { type: "stream", stream: result.textStream as ReadableStream<string> };
      }

      const result = await generateText({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.2
      });

      return { type: "text", text: result.text };
    }
  };
}
