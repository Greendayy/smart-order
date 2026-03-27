import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include"
  },
  plugins: [adminClient()]
});
