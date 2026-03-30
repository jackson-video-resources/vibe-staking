import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  ENCRYPTION_KEY: required("ENCRYPTION_KEY"),
  ANTHROPIC_API_KEY: required("ANTHROPIC_API_KEY"),
  TELEGRAM_BOT_TOKEN: optional("TELEGRAM_BOT_TOKEN", ""),
  TELEGRAM_CHAT_ID: optional("TELEGRAM_CHAT_ID", ""),
  RISK_TOLERANCE: parseInt(optional("RISK_TOLERANCE", "5")),
  PORT: parseInt(optional("PORT", "3000")),
  NODE_ENV: optional("NODE_ENV", "development"),
} as const;
