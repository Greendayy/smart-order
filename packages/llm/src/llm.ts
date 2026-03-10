// V1 scaffold: AI SDK CoreMessage support (no tool messages yet)
export type LlmRole = "system" | "user" | "assistant";

export type LlmMessage = {
  role: LlmRole;
  content: string;
};

export type ChatInput = {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  stream?: boolean;
};

export type ChatTextOutput = {
  type: "text";
  text: string;
};

export type ChatStreamOutput = {
  type: "stream";
  stream: ReadableStream<string>;
};

export type ChatOutput = ChatTextOutput | ChatStreamOutput;

export interface LlmProvider {
  chat(input: ChatInput): Promise<ChatOutput>;
}
