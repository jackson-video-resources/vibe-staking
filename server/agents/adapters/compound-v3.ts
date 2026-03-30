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
import { TOKEN_ADDRESSES } from "../../../shared/constants.js";
import type { EvmChain } from "../../wallet/multi-chain.js";

// Compound V3 (Comet) USDC market addresses
const COMPOUND_V3_COMET: Record<string, string> = {
  Ethereum: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
  Arbitrum: "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",
  Base: "0xb125E6687d4313864e53df431d5425969c15Eb2",
};

const COMET_ABI = [
  {
    name: "supply",
    type: "function",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const compoundV3Adapter: ProtocolAdapter = {
  protocol: "compound-v3",

  async deposit({ amountUsd, chain }: DepositParams): Promise<ExecutionResult> {
    try {
      const cometAddress = COMPOUND_V3_COMET[chain];
      if (!cometAddress)
        return { success: false, errorMessage: `Compound V3 not on ${chain}` };

      const usdcAddress = TOKEN_ADDRESSES[chain]?.USDC;
      if (!usdcAddress)
        return { success: false, errorMessage: `No USDC on ${chain}` };

      const walletClient = await getEvmWalletClient(chain as EvmChain);
      const publicClient = getEvmPublicClient(chain as EvmChain);
      const address = await getEvmAddress();
      const amount = BigInt(Math.floor(amountUsd * 1e6));

      await approveExact(
        walletClient,
        publicClient,
        usdcAddress as `0x${string}`,
        cometAddress as `0x${string}`,
        amount,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: cometAddress as `0x${string}`,
        abi: COMET_ABI,
        functionName: "supply",
        args: [usdcAddress as `0x${string}`, amount],
      });

      await revokeApproval(
        walletClient,
        usdcAddress as `0x${string}`,
        cometAddress as `0x${string}`,
      );

      return {
        success: true,
        txHash,
        gasCostUsd: chain === "Ethereum" ? 5 : 0.25,
      };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },

  async withdraw({
    amountUsd,
    chain,
  }: WithdrawParams): Promise<ExecutionResult> {
    try {
      const cometAddress = COMPOUND_V3_COMET[chain];
      if (!cometAddress)
        return { success: false, errorMessage: `Compound V3 not on ${chain}` };

      const usdcAddress = TOKEN_ADDRESSES[chain]?.USDC;
      if (!usdcAddress)
        return { success: false, errorMessage: `No USDC on ${chain}` };

      const walletClient = await getEvmWalletClient(chain as EvmChain);
      const amount = BigInt(Math.floor(amountUsd * 1e6));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: cometAddress as `0x${string}`,
        abi: COMET_ABI,
        functionName: "withdraw",
        args: [usdcAddress as `0x${string}`, amount],
      });

      return {
        success: true,
        txHash,
        gasCostUsd: chain === "Ethereum" ? 5 : 0.25,
      };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
