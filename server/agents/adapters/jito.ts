import type {
  ProtocolAdapter,
  DepositParams,
  WithdrawParams,
} from "./index.js";
import type { ExecutionResult } from "../../../shared/types.js";

// Jito — MEV-enhanced liquid staking on Solana (SOL → jitoSOL)
// Uses SPL Stake Pool program

const JITO_POOL_ADDRESS = "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb";
const SOL_PRICE_USD = 150;

export const jitoAdapter: ProtocolAdapter = {
  protocol: "jito",

  async deposit({ db, amountUsd }: DepositParams): Promise<ExecutionResult> {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { depositSol } = await import("@solana/spl-stake-pool");
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
      const stakePoolPubkey = new PublicKey(JITO_POOL_ADDRESS);
      const lamports = Math.floor((amountUsd / SOL_PRICE_USD) * 1e9);

      const { instructions, signers } = await depositSol(
        connection,
        stakePoolPubkey,
        keypair.publicKey,
        lamports,
      );

      const { Transaction } = await import("@solana/web3.js");
      const tx = new Transaction().add(...instructions);
      tx.feePayer = keypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(keypair, ...signers);

      const txHash = await connection.sendRawTransaction(tx.serialize());

      return { success: true, txHash, gasCostUsd: 0.001 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },

  async withdraw({ db, amountUsd }: WithdrawParams): Promise<ExecutionResult> {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { withdrawSol } = await import("@solana/spl-stake-pool");
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
      const stakePoolPubkey = new PublicKey(JITO_POOL_ADDRESS);
      const lamports = Math.floor((amountUsd / SOL_PRICE_USD) * 1e9);

      const { instructions, signers } = await withdrawSol(
        connection,
        stakePoolPubkey,
        keypair.publicKey,
        keypair.publicKey,
        lamports,
      );

      const { Transaction } = await import("@solana/web3.js");
      const tx = new Transaction().add(...instructions);
      tx.feePayer = keypair.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(keypair, ...signers);

      const txHash = await connection.sendRawTransaction(tx.serialize());

      return { success: true, txHash, gasCostUsd: 0.001 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
