import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./env.js";
import { healthRouter } from "./routes/health.js";
import { portfolioRouter } from "./routes/portfolio.js";
import { opportunitiesRouter } from "./routes/opportunities.js";
import { configRouter } from "./routes/config.js";
import { auditRouter } from "./routes/audit.js";
import { startScheduler } from "./cron/scheduler.js";
import { checkOnboarding } from "./wallet/generate.js";
import { startBot } from "./telegram/bot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Trust Railway's reverse proxy for x-forwarded-proto
app.set("trust proxy", 1);

// Redirect HTTP → HTTPS in production
app.use((req, res, next) => {
  if (
    env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
  }
  return next();
});

app.use(helmet({ contentSecurityPolicy: false }));

// Lock CORS to same-origin (dashboard is served by this same server)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      ...(process.env.RAILWAY_PUBLIC_DOMAIN
        ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`]
        : []),
    ],
    credentials: false,
  }),
);

app.use(express.json({ limit: "16kb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use("/api", healthRouter);
app.use("/api", portfolioRouter);
app.use("/api", opportunitiesRouter);
app.use("/api", configRouter);
app.use("/api", auditRouter);

// Serve dashboard
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(env.PORT, async () => {
  console.log(`[vibe-staking] running on port ${env.PORT}`);
  await checkOnboarding();
  startScheduler();
  await startBot();
});
