import type { DB } from "../db.js";
import { config, portfolioSnapshots } from "../../shared/schema.js";
import { getEvmPublicClient } from "./multi-chain.js";
import { auditAction } from "../agents/yield-scout.js";

let lastKnownEvmBalanceWei = 0n;

export async function checkForDeposits(db: DB): Promise<void> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg?.evmAddress || !cfg.onboardedAt) return;

  try {
    const client = getEvmPublicClient("Arbitrum"); // Check Arbitrum as primary L2
    const balanceWei = await client.getBalance({
      address: cfg.evmAddress as `0x${string}`,
    });

    if (balanceWei > lastKnownEvmBalanceWei + BigInt(1e15)) {
      const depositEth = Number(balanceWei - lastKnownEvmBalanceWei) / 1e18;
      console.log(
        `[balance-detector] New deposit detected: ~${depositEth.toFixed(4)} ETH on Arbitrum`,
      );

      await auditAction(
        db,
        "balance-detector",
        "deposit-detected",
        `Deposit: ~${depositEth.toFixed(4)} ETH`,
        {
          prevBalance: lastKnownEvmBalanceWei.toString(),
          newBalance: balanceWei.toString(),
        },
      );

      // Notify via Telegram
      const { notifyDeposit } = await import("../telegram/notifications.js");
      await notifyDeposit("Arbitrum", depositEth);
    }

    lastKnownEvmBalanceWei = balanceWei;
  } catch {
    // Non-fatal — RPC errors are common with public endpoints
  }
}
