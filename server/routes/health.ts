import { Router } from "express";
import { db } from "../db.js";
import { config, positions, portfolioSnapshots } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    const [cfg] = await db.select().from(config).limit(1);
    const activePositions = await db
      .select()
      .from(positions)
      .where(eq(positions.status, "active"));
    const [lastSnapshot] = await db
      .select()
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.timestamp))
      .limit(1);

    res.json({
      status: "ok",
      uptime: process.uptime(),
      isPaused: cfg?.isPaused ?? false,
      isOnboarded: !!cfg?.onboardedAt,
      positionCount: activePositions.length,
      lastScanAt: lastSnapshot?.timestamp ?? null,
    });
  } catch {
    res.status(503).json({ status: "error", message: "Database unavailable" });
  }
});
