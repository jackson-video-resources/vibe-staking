import type { DB } from "../db.js";
import { config } from "../../shared/schema.js";

export async function getMaxSlippageBps(db: DB): Promise<number> {
  const [cfg] = await db.select().from(config).limit(1);
  return cfg?.maxSlippageBps ?? 100; // default 1%
}

export function validateSlippage(
  actualSlippageBps: number,
  maxAllowedBps: number,
  context: string,
): void {
  if (actualSlippageBps > maxAllowedBps) {
    throw new Error(
      `Slippage guard: ${context} would have ${(actualSlippageBps / 100).toFixed(2)}% slippage, max allowed is ${(maxAllowedBps / 100).toFixed(2)}%`,
    );
  }
}

// Build LI.FI slippage config from DB settings
export async function getLifiSlippageConfig(db: DB): Promise<number> {
  const maxBps = await getMaxSlippageBps(db);
  return maxBps / 10_000; // LI.FI uses 0-1 decimal (0.01 = 1%)
}
