import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    strictPort: false,
    port: Number(process.env.WEB_PORT ?? "3000")
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"]
    }),
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    viteReact()
  ]
});
