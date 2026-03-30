import { db } from "../db.js";
import { config } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { sendDailySummary } from "./notifications.js";
import { positions, portfolioSnapshots } from "../../shared/schema.js";
import { desc } from "drizzle-orm";

export async function startBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[telegram] No TELEGRAM_BOT_TOKEN — bot disabled");
    return;
  }

  const ownerChatId = process.env.TELEGRAM_CHAT_ID;

  const { Telegraf } = await import("telegraf");
  const bot = new Telegraf(token);

  // Middleware: reject any message not from the owner's chat
  bot.use(async (ctx, next) => {
    if (!ownerChatId) {
      // No chat ID configured — allow (local dev without Telegram set up)
      return next();
    }
    if (String(ctx.chat?.id) !== ownerChatId) {
      await ctx.reply("Unauthorized.");
      return;
    }
    return next();
  });

  bot.command("status", async (ctx) => {
    const [cfg] = await db.select().from(config).limit(1);
    const [latest] = await db
      .select()
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.timestamp))
      .limit(1);

    const status = cfg?.isPaused ? "⏸ PAUSED" : "▶️ RUNNING";
    await ctx.reply(
      `${status}\n\n` +
        `Portfolio: $${latest?.totalValueUsd?.toFixed(2) ?? "0.00"}\n` +
        `APY: ${(latest?.netApyCurrent ?? 0).toFixed(1)}%\n` +
        `Risk tolerance: ${cfg?.riskTolerance ?? 5}/10\n` +
        `Pause reason: ${cfg?.pauseReason ?? "none"}`,
    );
  });

  bot.command("positions", async (ctx) => {
    const active = await db
      .select()
      .from(positions)
      .where(eq(positions.status, "active"));

    if (active.length === 0) {
      await ctx.reply(
        "No active positions. Send funds to your wallet to get started.",
      );
      return;
    }

    const list = active
      .map(
        (p) =>
          `• ${p.protocol} (${p.chain})\n  $${p.amountUsd.toFixed(0)} @ ${(p.currentApy ?? p.entryApy).toFixed(1)}% APY`,
      )
      .join("\n");

    await ctx.reply(`Active positions:\n\n${list}`);
  });

  bot.command("summary", async (ctx) => {
    await sendDailySummary(db);
    await ctx.reply("Summary sent.");
  });

  bot.command("pause", async (ctx) => {
    const [cfg] = await db.select().from(config).limit(1);
    if (!cfg) return ctx.reply("Not configured yet.");

    if (cfg.isPaused) {
      // Resume
      await db
        .update(config)
        .set({ isPaused: false, pauseReason: null, updatedAt: new Date() })
        .where(eq(config.id, cfg.id));
      await ctx.reply("▶️ System resumed. Agent will run on next cron cycle.");
    } else {
      // Pause
      await db
        .update(config)
        .set({
          isPaused: true,
          pauseReason: "Manual pause via Telegram",
          updatedAt: new Date(),
        })
        .where(eq(config.id, cfg.id));
      await ctx.reply("⏸ System paused. Use /pause again to resume.");
    }
  });

  bot.command("wallets", async (ctx) => {
    const [cfg] = await db.select().from(config).limit(1);
    if (!cfg) return ctx.reply("Not configured yet.");
    await ctx.reply(
      `Wallet addresses:\n\n` +
        `EVM (Ethereum/Arbitrum/Base):\n<code>${cfg.evmAddress ?? "not set"}</code>\n\n` +
        `Solana:\n<code>${cfg.solanaAddress ?? "not set"}</code>\n\n` +
        `Bittensor:\n<code>${cfg.bittensorAddress ?? "not set"}</code>`,
      { parse_mode: "HTML" },
    );
  });

  bot.launch();
  console.log("[telegram] Bot started");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
