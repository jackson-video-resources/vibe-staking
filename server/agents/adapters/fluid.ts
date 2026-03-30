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

// Fluid (fka Instadapp Lite) — capital-efficient lending on Ethereum + Arbitrum
// Docs: https://docs.fluid.instadapp.io
// fToken (ERC-4626 vault) interface: deposit / withdraw

const FLUID_VAULTS: Record<string, { fToken: string; underlying: string }> = {
  // Ethereum — fUSDC
  Ethereum: {
    fToken: "0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  },
  // Arbitrum — fUSDC
  Arbitrum: {
    fToken: "0x1A996cb54bb95462040408C06122D45D6Cdb6096",
    underlying: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  },
};

// ERC-4626 standard vault ABI
const FLUID_VAULT_ABI = [
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

export const fluidAdapter: ProtocolAdapter = {
  protocol: "fluid",

  async deposit({
    db,
    amountUsd,
    chain,
  }: DepositParams): Promise<ExecutionResult> {
    try {
      const vault = FLUID_VAULTS[chain];
      if (!vault)
        return {
          success: false,
          errorMessage: `Fluid not available on ${chain}`,
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
        vault.fToken as `0x${string}`,
        amountUsdc,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: vault.fToken as `0x${string}`,
        abi: FLUID_VAULT_ABI,
        functionName: "deposit",
        args: [amountUsdc, address as `0x${string}`],
      });

      await revokeApproval(
        walletClient,
        vault.underlying as `0x${string}`,
        vault.fToken as `0x${string}`,
      );

      return {
        success: true,
        txHash,
        gasCostUsd: chain === "Ethereum" ? 5 : 0.3,
      };
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
      const vault = FLUID_VAULTS[chain];
      if (!vault)
        return {
          success: false,
          errorMessage: `Fluid not available on ${chain}`,
        };

      const evmChain = chain as EvmChain;
      const walletClient = await getEvmWalletClient(evmChain);
      const address = await getEvmAddress();
      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: vault.fToken as `0x${string}`,
        abi: FLUID_VAULT_ABI,
        functionName: "withdraw",
        args: [amountUsdc, address as `0x${string}`, address as `0x${string}`],
      });

      return {
        success: true,
        txHash,
        gasCostUsd: chain === "Ethereum" ? 5 : 0.3,
      };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
