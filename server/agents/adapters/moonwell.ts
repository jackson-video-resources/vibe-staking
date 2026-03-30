import type {
  ProtocolAdapter,
  DepositParams,
  WithdrawParams,
} from "./index.js";
import type { ExecutionResult } from "../../../shared/types.js";
import {
  getEvmWalletClient,
  getEvmPublicClient,
  getEvmAddress,
} from "../../wallet/multi-chain.js";
import { approveExact, revokeApproval } from "../../safety/approval-guard.js";
import type { EvmChain } from "../../wallet/multi-chain.js";

// Moonwell — Compound V2 fork on Base (and Moonbeam)
// Docs: https://docs.moonwell.fi
// mToken ABI: mint (deposit) + redeemUnderlying (withdraw)

const MOONWELL_POOLS: Record<string, { mToken: string; underlying: string }> = {
  // Base — mUSDC
  Base: {
    mToken: "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
    underlying: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  },
};

const MTOKEN_ABI = [
  {
    name: "mint",
    type: "function",
    inputs: [{ name: "mintAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "redeemUnderlying",
    type: "function",
    inputs: [{ name: "redeemAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const moonwellAdapter: ProtocolAdapter = {
  protocol: "moonwell",

  async deposit({
    db,
    amountUsd,
    chain,
  }: DepositParams): Promise<ExecutionResult> {
    try {
      const pool = MOONWELL_POOLS[chain];
      if (!pool)
        return {
          success: false,
          errorMessage: `Moonwell not available on ${chain}`,
        };

      const evmChain = chain as EvmChain;
      const walletClient = await getEvmWalletClient(evmChain);
      const publicClient = getEvmPublicClient(evmChain);
      const address = await getEvmAddress();
      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      await approveExact(
        walletClient,
        publicClient,
        pool.underlying as `0x${string}`,
        pool.mToken as `0x${string}`,
        amountUsdc,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: pool.mToken as `0x${string}`,
        abi: MTOKEN_ABI,
        functionName: "mint",
        args: [amountUsdc],
      });

      await revokeApproval(
        walletClient,
        pool.underlying as `0x${string}`,
        pool.mToken as `0x${string}`,
      );

      return { success: true, txHash, gasCostUsd: 0.05 }; // Base is cheap
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },

  async withdraw({
    db,
    amountUsd,
    chain,
  }: WithdrawParams): Promise<ExecutionResult> {
    try {
      const pool = MOONWELL_POOLS[chain];
      if (!pool)
        return {
          success: false,
          errorMessage: `Moonwell not available on ${chain}`,
        };

      const evmChain = chain as EvmChain;
      const walletClient = await getEvmWalletClient(evmChain);
      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: pool.mToken as `0x${string}`,
        abi: MTOKEN_ABI,
        functionName: "redeemUnderlying",
        args: [amountUsdc],
      });

      return { success: true, txHash, gasCostUsd: 0.05 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
