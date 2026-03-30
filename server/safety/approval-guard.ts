import type { WalletClient, PublicClient } from "viem";
import { erc20Abi } from "viem";

// Approve EXACT amount needed — never infinite
export async function approveExact(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tokenAddress: `0x${string}`,
  spenderAddress: `0x${string}`,
  amount: bigint,
): Promise<`0x${string}`> {
  if (!walletClient.account) throw new Error("Wallet client has no account");

  // Check current allowance first — skip if already sufficient
  const currentAllowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [walletClient.account.address, spenderAddress],
  });

  if (currentAllowance >= amount) {
    console.log(
      "[approval-guard] Sufficient allowance already exists, skipping approval",
    );
    return "0x";
  }

  // Approve exact amount
  // viem v2 requires explicit chain override — cast to any to avoid false-positive TS error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHash = await (walletClient as any).writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [spenderAddress, amount],
  });

  console.log(
    `[approval-guard] Approved exact amount ${amount.toString()} to ${spenderAddress}: ${txHash}`,
  );
  return txHash as `0x${string}`;
}

// Revoke approval after transaction completes
export async function revokeApproval(
  walletClient: WalletClient,
  tokenAddress: `0x${string}`,
  spenderAddress: `0x${string}`,
): Promise<void> {
  if (!walletClient.account) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (walletClient as any).writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, 0n],
    });
    console.log(`[approval-guard] Revoked approval for ${spenderAddress}`);
  } catch (err) {
    // Non-fatal: log but don't throw
    console.error("[approval-guard] Failed to revoke approval:", err);
  }
}
