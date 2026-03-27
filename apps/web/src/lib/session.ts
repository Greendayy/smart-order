import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string;
};

export type SessionData = {
  user: SessionUser;
  session: { id: string; expiresAt: string; userId: string };
} | null;

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export const fetchSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionData> => {
    const request = getRequest();
    const cookie = request.headers.get("cookie") ?? "";

    try {
      const res = await fetch(`${apiUrl}/api/auth/get-session`, {
        headers: { cookie }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data ?? null;
    } catch {
      return null;
    }
  }
);
