import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
} from "viem";
import {
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
  bsc,
  avalanche,
} from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { PUBLIC_RPC_URLS } from "../../shared/constants.js";
import { db } from "../db.js";
import { config } from "../../shared/schema.js";
import { decrypt } from "./encrypt.js";

const CHAINS = {
  Ethereum: mainnet,
  Arbitrum: arbitrum,
  Base: base,
  Optimism: optimism,
  Polygon: polygon,
  BSC: bsc,
  Avalanche: avalanche,
} as const;

export type EvmChain = keyof typeof CHAINS;

// Returns a wallet client for a specific EVM chain
// Private key is decrypted only at call time and never cached
export async function getEvmWalletClient(
  chain: EvmChain,
): Promise<WalletClient> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg?.encryptedEvmKey) throw new Error("EVM wallet not configured");

  const decrypted = decrypt(cfg.encryptedEvmKey);
  const [, privateKeyHex] = decrypted.split(":");
  const account = privateKeyToAccount(`0x${privateKeyHex}` as `0x${string}`);

  return createWalletClient({
    account,
    chain: CHAINS[chain],
    transport: http(PUBLIC_RPC_URLS[chain]),
  });
}

// Returns a public (read-only) client for a specific EVM chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEvmPublicClient(chain: EvmChain): PublicClient<any> {
  return createPublicClient({
    chain: CHAINS[chain],
    transport: http(PUBLIC_RPC_URLS[chain]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

// Returns the EVM address without decrypting the private key
export async function getEvmAddress(): Promise<string> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg?.evmAddress) throw new Error("EVM wallet not configured");
  return cfg.evmAddress;
}
