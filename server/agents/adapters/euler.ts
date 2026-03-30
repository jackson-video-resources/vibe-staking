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

// Euler V2 — EVaults (ERC-4626) on Ethereum
// Docs: https://docs.euler.finance
// V2 rebuilt from scratch after V1 exploit — audited by multiple firms

const EULER_VAULTS: Record<string, { vault: string; underlying: string }> = {
  // Ethereum — Prime USDC EVault
  Ethereum: {
    vault: "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
};

// ERC-4626 standard
const EVAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
] as const;

export const eulerAdapter: ProtocolAdapter = {
  protocol: "euler",

  async deposit({
    db,
    amountUsd,
    chain,
  }: DepositParams): Promise<ExecutionResult> {
    try {
      const vault = EULER_VAULTS[chain];
      if (!vault)
        return {
          success: false,
          errorMessage: `Euler not available on ${chain}`,
        };

      const evmChain = chain as EvmChain;
      const walletClient = await getEvmWalletClient(evmChain);
      const publicClient = getEvmPublicClient(evmChain);
      const address = await getEvmAddress();
      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      await approveExact(
        walletClient,
        publicClient,
        vault.underlying as `0x${string}`,
        vault.vault as `0x${string}`,
        amountUsdc,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: vault.vault as `0x${string}`,
        abi: EVAULT_ABI,
        functionName: "deposit",
        args: [amountUsdc, address as `0x${string}`],
      });

      await revokeApproval(
        walletClient,
        vault.underlying as `0x${string}`,
        vault.vault as `0x${string}`,
      );

      return { success: true, txHash, gasCostUsd: 5 };
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
      const vault = EULER_VAULTS[chain];
      if (!vault)
        return {
          success: false,
          errorMessage: `Euler not available on ${chain}`,
        };

      const evmChain = chain as EvmChain;
      const walletClient = await getEvmWalletClient(evmChain);
      const address = await getEvmAddress();
      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: vault.vault as `0x${string}`,
        abi: EVAULT_ABI,
        functionName: "withdraw",
        args: [amountUsdc, address as `0x${string}`, address as `0x${string}`],
      });

      return { success: true, txHash, gasCostUsd: 5 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
