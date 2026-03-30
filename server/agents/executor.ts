import type { DB } from "../db.js";
import { positions, transactions } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import type { Move, ExecutionResult } from "../../shared/types.js";
import { isPaused } from "../safety/circuit-breaker.js";
import { checkRateLimit, checkGasBudget } from "../safety/rate-limiter.js";
import { getLifiSlippageConfig } from "../safety/slippage-guard.js";
import { auditAction } from "./yield-scout.js";
import { getAdapterForProtocol } from "./adapters/index.js";
import { notifyMove, notifyExecution } from "../telegram/notifications.js";

export async function executeMove(
  db: DB,
  move: Move,
): Promise<ExecutionResult> {
  // --- Pre-flight safety checks ---
  if (await isPaused(db)) {
    return { success: false, errorMessage: "System is paused" };
  }

  const { allowed: rateOk } = await checkRateLimit(db);
  if (!rateOk) {
    return { success: false, errorMessage: "Daily move limit reached" };
  }

  const adapter = getAdapterForProtocol(move.toOpportunity.protocol);
  if (!adapter) {
    return {
      success: false,
      errorMessage: `No adapter for protocol: ${move.toOpportunity.protocol}`,
    };
  }

  const slippage = await getLifiSlippageConfig(db);

  // Log the move attempt
  const [txRecord] = await db
    .insert(transactions)
    .values({
      chain: move.toOpportunity.chain,
      type: move.type,
      amountUsd: move.amountUsd,
      status: "pending",
    })
    .returning();

  // Notify Telegram before executing
  await notifyMove(move);

  try {
    // Exit old position if shift/exit
    if (
      move.fromPositionId &&
      (move.type === "exit" || move.type === "shift")
    ) {
      const [oldPos] = await db
        .select()
        .from(positions)
        .where(eq(positions.id, move.fromPositionId));

      if (oldPos) {
        const oldAdapter = getAdapterForProtocol(oldPos.protocol);
        if (oldAdapter) {
          const exitResult = await oldAdapter.withdraw({
            db,
            amountUsd: oldPos.amountUsd,
            chain: oldPos.chain,
          });

          await db
            .update(positions)
            .set({
              status: "closed",
              exitedAt: new Date(),
              exitTxHash: exitResult.txHash,
            })
            .where(eq(positions.id, move.fromPositionId));
        }
      }
    }

    // Enter new position
    const enterResult = await adapter.deposit({
      db,
      amountUsd: move.amountUsd,
      chain: move.toOpportunity.chain,
      slippage,
    });

    if (!enterResult.success) {
      await db
        .update(transactions)
        .set({ status: "failed", errorMessage: enterResult.errorMessage })
        .where(eq(transactions.id, txRecord.id));

      return enterResult;
    }

    // Record new position
    await db.insert(positions).values({
      chain: move.toOpportunity.chain,
      protocol: move.toOpportunity.protocol,
      pool: move.toOpportunity.llamaPoolId,
      symbol: move.toOpportunity.symbol,
      amountUsd: move.amountUsd,
      amountNative: "0", // updated by protocol adapter
      tokenAddress: null,
      entryApy: move.toOpportunity.apy,
      currentApy: move.toOpportunity.apy,
      status: "active",
      entryTxHash: enterResult.txHash,
      enteredAt: new Date(),
    });

    // Update transaction record
    await db
      .update(transactions)
      .set({
        status: "confirmed",
        txHash: enterResult.txHash,
        gasCostUsd: enterResult.gasCostUsd,
      })
      .where(eq(transactions.id, txRecord.id));

    await auditAction(
      db,
      "executor",
      "move-executed",
      `${move.type} into ${move.toOpportunity.protocol} on ${move.toOpportunity.chain}: $${move.amountUsd.toFixed(2)} @ ${move.toOpportunity.apy.toFixed(1)}% APY`,
      { move, txHash: enterResult.txHash, gasCostUsd: enterResult.gasCostUsd },
    );

    await notifyExecution(
      enterResult.txHash ?? "unknown",
      "confirmed",
      move.toOpportunity.chain,
    );

    return enterResult;
  } catch (err) {
    const message = String(err);
    await db
      .update(transactions)
      .set({ status: "failed", errorMessage: message })
      .where(eq(transactions.id, txRecord.id));

    await notifyExecution(undefined, "failed", move.toOpportunity.chain);

    return { success: false, errorMessage: message };
  }
}
