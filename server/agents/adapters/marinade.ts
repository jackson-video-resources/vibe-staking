import type {
  ProtocolAdapter,
  DepositParams,
  WithdrawParams,
} from "./index.js";
import type { ExecutionResult } from "../../../shared/types.js";

// Marinade Finance — Solana liquid staking (SOL → mSOL)
// Full implementation requires @marinade.finance/marinade-ts-sdk + Solana keypair
// This adapter provides the integration scaffold

const SOL_PRICE_USD = 150; // Would fetch from oracle in production

export const marinadeAdapter: ProtocolAdapter = {
  protocol: "marinade-finance",

  async deposit({ db, amountUsd }: DepositParams): Promise<ExecutionResult> {
    try {
      const { Connection } = await import("@solana/web3.js");
      const { Marinade, MarinadeConfig } =
        await import("@marinade.finance/marinade-ts-sdk");
      const { decrypt } = await import("../../wallet/encrypt.js");
      const { config } = await import("../../../shared/schema.js");
      const { eq } = await import("drizzle-orm");

      const [cfg] = await db.select().from(config).limit(1);
      if (!cfg?.encryptedSolanaKey)
        return { success: false, errorMessage: "Solana wallet not configured" };

      const bs58 = (await import("bs58")).default;
      const { Keypair } = await import("@solana/web3.js");

      const privKeyBase58 = decrypt(cfg.encryptedSolanaKey);
      const keypair = Keypair.fromSecretKey(bs58.decode(privKeyBase58));

      const connection = new Connection(
        "https://api.mainnet-beta.solana.com",
        "confirmed",
      );
      const marinadeConfig = new MarinadeConfig({ connection });
      const marinade = new Marinade(marinadeConfig);

      const lamports = BigInt(Math.floor((amountUsd / SOL_PRICE_USD) * 1e9));
      const { transaction } = await marinade.deposit(Number(lamports));

      // Sign and send
      transaction.sign([keypair]);
      const txHash = await connection.sendRawTransaction(
        transaction.serialize(),
      );

      return { success: true, txHash, gasCostUsd: 0.001 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },

  async withdraw({ db, amountUsd }: WithdrawParams): Promise<ExecutionResult> {
    try {
      const { Connection } = await import("@solana/web3.js");
      const { Marinade, MarinadeConfig } =
        await import("@marinade.finance/marinade-ts-sdk");
      const { decrypt } = await import("../../wallet/encrypt.js");
      const { config } = await import("../../../shared/schema.js");

      const [cfg] = await db.select().from(config).limit(1);
      if (!cfg?.encryptedSolanaKey)
        return { success: false, errorMessage: "Solana wallet not configured" };

      const bs58 = (await import("bs58")).default;
      const { Keypair } = await import("@solana/web3.js");

      const privKeyBase58 = decrypt(cfg.encryptedSolanaKey);
      const keypair = Keypair.fromSecretKey(bs58.decode(privKeyBase58));

      const connection = new Connection(
        "https://api.mainnet-beta.solana.com",
        "confirmed",
      );
      const marinadeConfig = new MarinadeConfig({ connection });
      const marinade = new Marinade(marinadeConfig);

      // Liquid unstake: mSOL → SOL via Marinade liquidity pool (instant)
      const msolLamports = BigInt(
        Math.floor((amountUsd / SOL_PRICE_USD) * 1e9),
      );
      const { transaction } = await marinade.liquidUnstake(
        Number(msolLamports),
      );

      transaction.sign([keypair]);
      const txHash = await connection.sendRawTransaction(
        transaction.serialize(),
      );

      return { success: true, txHash, gasCostUsd: 0.001 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
