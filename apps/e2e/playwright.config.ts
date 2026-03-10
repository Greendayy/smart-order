import { defineConfig } from "@playwright/test";

const webServer = process.env.E2E_START_SERVERS
  ? [
      {
        command: "bun --cwd ../../apps/api dev",
        url: "http://localhost:3001/health",
        reuseExistingServer: true,
        timeout: 120_000
      },
      {
        command: "bun --cwd ../../apps/web dev",
        url: "http://localhost:3000/",
        reuseExistingServer: true,
        timeout: 120_000
      }
    ]
  : null;

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000"
  },
  ...(webServer ? { webServer } : {})
});
