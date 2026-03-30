import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { db } from "../db.js";
import { config } from "../../shared/schema.js";

export const configRouter = Router();

// Admin key guard — required on all write operations.
// If ADMIN_KEY env var is not set, writes are blocked in production.
function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    // No admin key configured — lock down writes
    return res
      .status(503)
      .json({ error: "Server not configured: ADMIN_KEY missing" });
  }
  if (req.headers["x-admin-key"] !== adminKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

configRouter.get("/config", async (_req, res) => {
  try {
    const [cfg] = await db.select().from(config).limit(1);
    if (!cfg) return res.json({ data: null });

    // Never expose encrypted keys
    const safe = {
      id: cfg.id,
      riskTolerance: cfg.riskTolerance,
      maxSlippageBps: cfg.maxSlippageBps,
      maxMovesPerDay: cfg.maxMovesPerDay,
      circuitBreakerPct: cfg.circuitBreakerPct,
      gasBudgetUsdPerDay: cfg.gasBudgetUsdPerDay,
      rebalanceThresholdPct: cfg.rebalanceThresholdPct,
      isPaused: cfg.isPaused,
      pauseReason: cfg.pauseReason,
      evmAddress: cfg.evmAddress,
      solanaAddress: cfg.solanaAddress,
      bittensorAddress: cfg.bittensorAddress,
      onboardedAt: cfg.onboardedAt,
    };
    res.json({ data: safe });
  } catch {
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

configRouter.put("/config", requireAdminKey, async (req, res) => {
  try {
    const {
      riskTolerance,
      maxSlippageBps,
      maxMovesPerDay,
      circuitBreakerPct,
      gasBudgetUsdPerDay,
      rebalanceThresholdPct,
    } = req.body;

    // Validate ranges — only update fields that pass
    const updates: Record<string, number> = {};

    if (riskTolerance !== undefined) {
      const v = Number(riskTolerance);
      if (!Number.isInteger(v) || v < 1 || v > 10)
        return res.status(400).json({ error: "riskTolerance must be 1-10" });
      updates.riskTolerance = v;
    }
    if (maxSlippageBps !== undefined) {
      const v = Number(maxSlippageBps);
      if (!Number.isFinite(v) || v < 10 || v > 500)
        return res.status(400).json({ error: "maxSlippageBps must be 10-500" });
      updates.maxSlippageBps = v;
    }
    if (maxMovesPerDay !== undefined) {
      const v = Number(maxMovesPerDay);
      if (!Number.isInteger(v) || v < 1 || v > 20)
        return res.status(400).json({ error: "maxMovesPerDay must be 1-20" });
      updates.maxMovesPerDay = v;
    }
    if (circuitBreakerPct !== undefined) {
      const v = Number(circuitBreakerPct);
      if (!Number.isFinite(v) || v < 1 || v > 50)
        return res
          .status(400)
          .json({ error: "circuitBreakerPct must be 1-50" });
      updates.circuitBreakerPct = v;
    }
    if (gasBudgetUsdPerDay !== undefined) {
      const v = Number(gasBudgetUsdPerDay);
      if (!Number.isFinite(v) || v < 1 || v > 100)
        return res
          .status(400)
          .json({ error: "gasBudgetUsdPerDay must be 1-100" });
      updates.gasBudgetUsdPerDay = v;
    }
    if (rebalanceThresholdPct !== undefined) {
      const v = Number(rebalanceThresholdPct);
      if (!Number.isFinite(v) || v < 0.5 || v > 10)
        return res
          .status(400)
          .json({ error: "rebalanceThresholdPct must be 0.5-10" });
      updates.rebalanceThresholdPct = v;
    }

    const [cfg] = await db.select().from(config).limit(1);
    if (!cfg) return res.status(404).json({ error: "Not configured yet" });

    const [updated] = await db
      .update(config)
      .set({ ...updates, updatedAt: new Date() })
      .returning();

    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: "Failed to update config" });
  }
});
