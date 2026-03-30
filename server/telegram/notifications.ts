import type { DB } from "../db.js";
import { portfolioSnapshots, positions, config } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import type { Move } from "../../shared/types.js";

let bot: import("telegraf").Telegraf | null = null;

async function getBot() {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    const { Telegraf } = await import("telegraf");
    bot = new Telegraf(token);
  }
  return bot;
}

async function send(text: string): Promise<void> {
  const b = await getBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!b || !chatId) return;
  await b.telegram
    .sendMessage(chatId, text, { parse_mode: "HTML" })
    .catch(() => {});
}

export async function notifyDeposit(
  chain: string,
  amountEth: number,
): Promise<void> {
  await send(
    `💰 <b>Deposit detected</b>\n~${amountEth.toFixed(4)} ETH on ${chain}\n\nDeploying capital to highest-yield position...`,
  );
}

export async function notifyMove(move: Move): Promise<void> {
  const action =
    move.type === "enter"
      ? "Entering"
      : move.type === "exit"
        ? "Exiting"
        : "Shifting to";
  await send(
    `⚡ <b>${action} ${move.toOpportunity.protocol}</b>\n` +
      `Chain: ${move.toOpportunity.chain}\n` +
      `Amount: $${move.amountUsd.toFixed(2)}\n` +
      `APY: ${move.toOpportunity.apy.toFixed(1)}%\n` +
      `Reason: ${move.reasoning}`,
  );
}

export async function notifyExecution(
  txHash: string | undefined,
  status: "confirmed" | "failed",
  chain: string,
): Promise<void> {
  const icon = status === "confirmed" ? "✅" : "❌";
  const msg =
    status === "confirmed"
      ? `${icon} <b>Transaction confirmed</b> on ${chain}\nTx: <code>${txHash}</code>`
      : `${icon} <b>Transaction failed</b> on ${chain}`;
  await send(msg);
}

export async function notifyCircuitBreaker(drawdownPct: number): Promise<void> {
  await send(
    `🚨 <b>CIRCUIT BREAKER TRIGGERED</b>\n\n` +
      `Portfolio down <b>${drawdownPct.toFixed(1)}%</b> from peak.\n` +
      `All operations <b>paused</b>.\n\n` +
      `Use /resume to restart after reviewing positions.`,
  );
}

export async function sendDailySummary(db: DB): Promise<void> {
  const [latest] = await db
    .select()
    .from(portfolioSnapshots)
    .orderBy(desc(portfolioSnapshots.timestamp))
    .limit(1);

  const activePositions = await db
    .select()
    .from(positions)
    .where(eq(positions.status, "active"));

  if (!latest) {
    await send(
      "📊 <b>Daily Summary</b>\n\nNo portfolio data yet. Send funds to your wallet to get started.",
    );
    return;
  }

  const positionsList = activePositions
    .map(
      (p) =>
        `• ${p.protocol} (${p.chain}): $${p.amountUsd.toFixed(0)} @ ${(p.currentApy ?? p.entryApy).toFixed(1)}%`,
    )
    .join("\n");

  await send(
    `📊 <b>Daily Summary</b>\n\n` +
      `Portfolio: <b>$${latest.totalValueUsd.toFixed(2)}</b>\n` +
      `Current APY: <b>${(latest.netApyCurrent ?? 0).toFixed(1)}%</b>\n` +
      `Yield earned: <b>$${latest.totalYieldEarnedUsd.toFixed(2)}</b>\n` +
      `Gas spent: <b>$${latest.totalGasSpentUsd.toFixed(2)}</b>\n` +
      `Drawdown: <b>${latest.drawdownPct.toFixed(1)}%</b>\n\n` +
      `<b>Positions (${activePositions.length}):</b>\n${positionsList || "None"}`,
  );
}

export async function notifyError(
  context: string,
  error: string,
): Promise<void> {
  await send(
    `⚠️ <b>Error</b> in ${context}\n<code>${error.slice(0, 300)}</code>`,
  );
}
