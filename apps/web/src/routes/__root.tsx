/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute, redirect } from "@tanstack/react-router";
import "../styles.css";

function isLoggedIn() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("smart_order_logged_in") === "true";
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smart Order" }
    ]
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname !== "/login" && !isLoggedIn()) {
      throw redirect({ to: "/login" });
    }
  },
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
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
