import type {
  ProtocolAdapter,
  DepositParams,
  WithdrawParams,
} from "./index.js";
import type { ExecutionResult } from "../../../shared/types.js";
import { getEvmWalletClient, getEvmAddress } from "../../wallet/multi-chain.js";
import { LIDO_STETH } from "../../../shared/constants.js";

// Lido stETH ABI (submit + withdrawal queue)
const LIDO_ABI = [
  {
    name: "submit",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "_referral", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Rough ETH price assumption for USD->ETH conversion
// In production this would fetch from an oracle
const ETH_PRICE_USD = 3000;

export const lidoAdapter: ProtocolAdapter = {
  protocol: "lido",

  async deposit({ amountUsd }: DepositParams): Promise<ExecutionResult> {
    try {
      const walletClient = await getEvmWalletClient("Ethereum");
      const address = await getEvmAddress();

      const amountEth = BigInt(Math.floor((amountUsd / ETH_PRICE_USD) * 1e18));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txHash = await (walletClient as any).writeContract({
        address: LIDO_STETH as `0x${string}`,
        abi: LIDO_ABI,
        functionName: "submit",
        args: [address as `0x${string}`],
        value: amountEth,
      });

      return { success: true, txHash, gasCostUsd: 5 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },

  async withdraw(_params: WithdrawParams): Promise<ExecutionResult> {
    // Lido uses a withdrawal queue — simplified: route via LI.FI to swap stETH→ETH
    return {
      success: false,
      errorMessage:
        "Lido withdrawal uses withdrawal queue — implement via stETH→ETH swap on LI.FI",
    };
  },
};
