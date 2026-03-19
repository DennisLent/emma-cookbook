import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "DATABASE_ENGINE=sqlite python3 manage.py migrate --noinput && DATABASE_ENGINE=sqlite python3 manage.py runserver 127.0.0.1:8000",
      cwd: "../backend",
      port: 8000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173",
      cwd: ".",
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
