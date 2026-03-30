import type { DB } from "../db.js";
import { config, transactions, auditLog } from "../../shared/schema.js";
import { gte, count, and, ne } from "drizzle-orm";

export async function checkRateLimit(
  db: DB,
): Promise<{ allowed: boolean; movesRemainingToday: number }> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg) return { allowed: false, movesRemainingToday: 0 };

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: count() })
    .from(transactions)
    .where(
      and(
        gte(transactions.createdAt, startOfDay),
        ne(transactions.type, "approve"), // Don't count approvals as "moves"
      ),
    );

  const movesUsed = result?.count ?? 0;
  const movesRemainingToday = Math.max(0, cfg.maxMovesPerDay - movesUsed);

  return {
    allowed: movesRemainingToday > 0,
    movesRemainingToday,
  };
}

export async function checkGasBudget(
  db: DB,
  estimatedGasUsd: number,
): Promise<{ allowed: boolean; budgetRemainingUsd: number }> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg) return { allowed: false, budgetRemainingUsd: 0 };

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(transactions)
    .where(gte(transactions.createdAt, startOfDay));

  const gasSpentToday = rows.reduce((sum, tx) => sum + (tx.gasCostUsd ?? 0), 0);
  const budgetRemainingUsd = Math.max(
    0,
    cfg.gasBudgetUsdPerDay - gasSpentToday,
  );

  return {
    allowed: estimatedGasUsd <= budgetRemainingUsd,
    budgetRemainingUsd,
  };
}
