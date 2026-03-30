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

// Morpho Blue — permissionless lending markets on Ethereum, Base, Arbitrum
// Docs: https://docs.morpho.org
// Uses MetaMorpho vaults (ERC-4626) — same interface as Fluid

const MORPHO_VAULTS: Record<
  string,
  { vault: string; underlying: string; name: string }
> = {
  // Ethereum — Steakhouse USDC vault (highest TVL MetaMorpho vault)
  Ethereum: {
    vault: "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB",
    underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: "Steakhouse USDC",
  },
  // Base — Moonwell Flagship USDC vault
  Base: {
    vault: "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca",
    underlying: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "Moonwell Flagship USDC",
  },
  // Arbitrum — Re7 USDC vault
  Arbitrum: {
    vault: "0x890A69EF363C9c7BdD5E36eb95Ceb569F63ACbF6",
    underlying: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    name: "Re7 USDC",
  },
};

// ERC-4626 standard
const VAULT_ABI = [
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

export const morphoAdapter: ProtocolAdapter = {
  protocol: "morpho",

  async deposit({
    db,
    amountUsd,
    chain,
  }: DepositParams): Promise<ExecutionResult> {
    try {
      const vault = MORPHO_VAULTS[chain];
      if (!vault)
        return {
          success: false,
          errorMessage: `Morpho not available on ${chain}`,
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
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amountUsdc, address as `0x${string}`],
      });

      await revokeApproval(
        walletClient,
        vault.underlying as `0x${string}`,
        vault.vault as `0x${string}`,
      );

      return {
        success: true,
        txHash,
        gasCostUsd: chain === "Ethereum" ? 5 : 0.1,
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
      const vault = MORPHO_VAULTS[chain];
      if (!vault)
        return {
          success: false,
          errorMessage: `Morpho not available on ${chain}`,
        };

      const evmChain = chain as EvmChain;
      const walletClient = await getEvmWalletClient(evmChain);
      const address = await getEvmAddress();
      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: vault.vault as `0x${string}`,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amountUsdc, address as `0x${string}`, address as `0x${string}`],
      });

      return {
        success: true,
        txHash,
        gasCostUsd: chain === "Ethereum" ? 5 : 0.1,
      };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
