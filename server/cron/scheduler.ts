import cron from "node-cron";
import { db } from "../db.js";

// Cron jobs wired up in Phase 3+
export function startScheduler() {
  console.log("[scheduler] started");

  // Opportunity scan every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    const { runScanCycle } = await import("../agents/yield-scout.js");
    await runScanCycle(db).catch(console.error);
  });

  // Balance detection every 60 seconds
  cron.schedule("* * * * *", async () => {
    const { checkForDeposits } = await import("../wallet/balance-detector.js");
    await checkForDeposits(db).catch(console.error);
  });

  // Portfolio snapshot every hour
  cron.schedule("0 * * * *", async () => {
    const { takeSnapshot } = await import("../agents/yield-scout.js");
    await takeSnapshot(db).catch(console.error);
  });

  // Circuit breaker check every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    const { checkCircuitBreaker } =
      await import("../safety/circuit-breaker.js");
    await checkCircuitBreaker(db).catch(console.error);
  });

  // Daily summary at 08:00 UTC
  cron.schedule("0 8 * * *", async () => {
    const { sendDailySummary } = await import("../telegram/notifications.js");
    await sendDailySummary(db).catch(console.error);
  });
}
