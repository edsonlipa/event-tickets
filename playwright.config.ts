import { defineConfig } from "@playwright/test";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // CI proporciona las variables directamente.
}

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3001" },
  reporter: "list",
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    env: {
      ...process.env,
      EMAIL_SENDING_PROVIDER: "nodemailer",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "55425",
      SMTP_SECURE: "false",
      SMTP_USER: "",
      SMTP_PASS: "",
      CRON_SECRET: process.env.CRON_SECRET || "cron-e2e",
      GUARDIA_PIN: process.env.GUARDIA_PIN || "123456",
      SESSION_SECRET: process.env.SESSION_SECRET || "session-secret-e2e-con-mas-de-32-bytes",
    },
  },
});
