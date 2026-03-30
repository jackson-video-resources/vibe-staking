import type { DB } from "../db.js";
import { config, portfolioSnapshots } from "../../shared/schema.js";
import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";

export async function checkCircuitBreaker(
  db: DB,
): Promise<{ safe: boolean; drawdownPct: number }> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg || cfg.isPaused) return { safe: false, drawdownPct: 0 };

  // Get the last 24h of snapshots
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snapshots = await db
    .select()
    .from(portfolioSnapshots)
    .orderBy(desc(portfolioSnapshots.timestamp))
    .limit(48); // max 48 hourly snapshots in 48h window

  if (snapshots.length < 2) return { safe: true, drawdownPct: 0 };

  const current = snapshots[0];
  const highWaterMark = current.highWaterMarkUsd;

  if (highWaterMark <= 0) return { safe: true, drawdownPct: 0 };

  const drawdownPct =
    ((highWaterMark - current.totalValueUsd) / highWaterMark) * 100;

  if (drawdownPct > cfg.circuitBreakerPct) {
    console.warn(
      `[circuit-breaker] TRIGGERED: ${drawdownPct.toFixed(1)}% drawdown (threshold: ${cfg.circuitBreakerPct}%)`,
    );

    await db
      .update(config)
      .set({
        isPaused: true,
        pauseReason: `Circuit breaker: ${drawdownPct.toFixed(1)}% drawdown in 24h`,
        updatedAt: new Date(),
      })
      .where(eq(config.id, cfg.id));

    const { notifyCircuitBreaker } =
      await import("../telegram/notifications.js");
    await notifyCircuitBreaker(drawdownPct);

    return { safe: false, drawdownPct };
  }

  return { safe: true, drawdownPct };
}

export async function isPaused(db: DB): Promise<boolean> {
  const [cfg] = await db.select().from(config).limit(1);
  return cfg?.isPaused ?? false;
}
