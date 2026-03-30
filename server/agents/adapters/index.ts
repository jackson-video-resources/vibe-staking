import type { DB } from "../../db.js";
import type { ExecutionResult } from "../../../shared/types.js";

export interface DepositParams {
  db: DB;
  amountUsd: number;
  chain: string;
  slippage: number;
}

export interface WithdrawParams {
  db: DB;
  amountUsd: number;
  chain: string;
}

export interface ProtocolAdapter {
  protocol: string;
  deposit(params: DepositParams): Promise<ExecutionResult>;
  withdraw(params: WithdrawParams): Promise<ExecutionResult>;
}

// Dynamic adapter registry
const adapters: Map<string, ProtocolAdapter> = new Map();

export function registerAdapter(adapter: ProtocolAdapter): void {
  adapters.set(adapter.protocol, adapter);
}

export function getAdapterForProtocol(
  protocol: string,
): ProtocolAdapter | null {
  return adapters.get(protocol) ?? null;
}

// Register all adapters on import
import { aaveV3Adapter } from "./aave-v3.js";
import { lidoAdapter } from "./lido.js";
import { compoundV3Adapter } from "./compound-v3.js";
import { marinadeAdapter } from "./marinade.js";
import { jitoAdapter } from "./jito.js";
import { taoDelegate } from "./tao-delegate.js";

registerAdapter(aaveV3Adapter);
registerAdapter(lidoAdapter);
registerAdapter(compoundV3Adapter);
registerAdapter(marinadeAdapter);
registerAdapter(jitoAdapter);
registerAdapter(taoDelegate);
