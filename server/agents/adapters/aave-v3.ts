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
import { AAVE_V3_POOL, TOKEN_ADDRESSES } from "../../../shared/constants.js";
import type { EvmChain } from "../../wallet/multi-chain.js";

const AAVE_POOL_ABI = [
  {
    name: "supply",
    type: "function",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const aaveV3Adapter: ProtocolAdapter = {
  protocol: "aave-v3",

  async deposit({
    db,
    amountUsd,
    chain,
  }: DepositParams): Promise<ExecutionResult> {
    try {
      const evmChain = chain as EvmChain;
      const poolAddress = AAVE_V3_POOL[chain];
      if (!poolAddress)
        return {
          success: false,
          errorMessage: `Aave V3 not available on ${chain}`,
        };

      const usdcAddress = TOKEN_ADDRESSES[chain]?.USDC;
      if (!usdcAddress)
        return {
          success: false,
          errorMessage: `USDC not configured for ${chain}`,
        };

      const walletClient = await getEvmWalletClient(evmChain);
      const publicClient = getEvmPublicClient(evmChain);
      const address = await getEvmAddress();

      // Convert USD to USDC (6 decimals)
      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      // Approve exact amount to Aave pool
      await approveExact(
        walletClient,
        publicClient,
        usdcAddress as `0x${string}`,
        poolAddress as `0x${string}`,
        amountUsdc,
      );

      // Supply to Aave
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: poolAddress as `0x${string}`,
        abi: AAVE_POOL_ABI,
        functionName: "supply",
        args: [
          usdcAddress as `0x${string}`,
          amountUsdc,
          address as `0x${string}`,
          0,
        ],
      });

      // Revoke approval after deposit
      await revokeApproval(
        walletClient,
        usdcAddress as `0x${string}`,
        poolAddress as `0x${string}`,
      );

      // Estimate gas cost (~$0.10-0.50 on Arbitrum)
      const gasCostUsd = chain === "Ethereum" ? 5 : 0.3;

      return { success: true, txHash, gasCostUsd };
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
      const evmChain = chain as EvmChain;
      const poolAddress = AAVE_V3_POOL[chain];
      if (!poolAddress)
        return {
          success: false,
          errorMessage: `Aave V3 not available on ${chain}`,
        };

      const usdcAddress = TOKEN_ADDRESSES[chain]?.USDC;
      if (!usdcAddress)
        return {
          success: false,
          errorMessage: `USDC not configured for ${chain}`,
        };

      const walletClient = await getEvmWalletClient(evmChain);
      const address = await getEvmAddress();

      const amountUsdc = BigInt(Math.floor(amountUsd * 1e6));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: poolAddress as `0x${string}`,
        abi: AAVE_POOL_ABI,
        functionName: "withdraw",
        args: [
          usdcAddress as `0x${string}`,
          amountUsdc,
          address as `0x${string}`,
        ],
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
