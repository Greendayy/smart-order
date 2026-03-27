/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute, redirect } from "@tanstack/react-router";
import { fetchSession } from "../lib/session";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const session = await fetchSession();
    const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

    if (!session && !isAuthPage) {
      throw redirect({ to: "/login" });
    }
    if (session && isAuthPage) {
      throw redirect({ to: "/" });
    }

    return { session };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smart Order" }
    ]
  }),
  component: RootComponent
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
