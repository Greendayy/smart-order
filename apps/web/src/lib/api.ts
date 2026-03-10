import { treaty } from "@elysiajs/eden";
import type { Api } from "@smart-order/api-contract";

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export const api = treaty<Api>(baseUrl);

