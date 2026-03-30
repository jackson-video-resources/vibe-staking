import { Router } from "express";
import { db } from "../db.js";
import { positions, portfolioSnapshots, config } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";

export const portfolioRouter = Router();

portfolioRouter.get("/portfolio", async (_req, res) => {
  try {
    const [cfg] = await db.select().from(config).limit(1);
    const activePositions = await db
      .select()
      .from(positions)
      .where(eq(positions.status, "active"));
    const [latest] = await db
      .select()
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.timestamp))
      .limit(1);

    res.json({
      data: {
        totalValueUsd: latest?.totalValueUsd ?? 0,
        netApyCurrent: latest?.netApyCurrent ?? 0,
        totalYieldEarnedUsd: latest?.totalYieldEarnedUsd ?? 0,
        totalGasSpentUsd: latest?.totalGasSpentUsd ?? 0,
        drawdownPct: latest?.drawdownPct ?? 0,
        positionCount: activePositions.length,
        positions: activePositions,
        lastSnapshotAt: latest?.timestamp ?? null,
        isOnboarded: !!cfg?.onboardedAt,
        wallets: {
          evm: cfg?.evmAddress ?? null,
          solana: cfg?.solanaAddress ?? null,
          bittensor: cfg?.bittensorAddress ?? null,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

portfolioRouter.get("/positions", async (_req, res) => {
  try {
    const all = await db
      .select()
      .from(positions)
      .orderBy(desc(positions.enteredAt));
    res.json({ data: all });
  } catch {
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

portfolioRouter.get("/history", async (_req, res) => {
  try {
    const snapshots = await db
      .select()
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.timestamp))
      .limit(168); // 7 days at 1hr intervals
    res.json({ data: snapshots });
  } catch {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
