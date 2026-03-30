export interface LlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  apyMean30d: number | null;
  pool: string;
  stablecoin: boolean;
  ilRisk: string | null;
  mu: number | null;
  sigma: number | null;
  apyPct7D: number | null;
  underlyingTokens: string[] | null;
  rewardTokens: string[] | null;
}

export interface ScoredOpportunity {
  llamaPoolId: string;
  chain: string;
  protocol: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  apyMean30d: number | null;
  stablecoin: boolean;
  ilRisk: string | null;
  riskScore: number;
  vibeScore: number;
  executable: boolean;
}

export interface Position {
  id: string;
  chain: string;
  protocol: string;
  pool: string;
  symbol: string;
  amountUsd: number;
  amountNative: string;
  tokenAddress: string | null;
  entryApy: number;
  currentApy: number | null;
  status: string;
  entryTxHash: string | null;
  enteredAt: Date;
}

export interface Move {
  type: "enter" | "exit" | "shift";
  fromPositionId?: string;
  toOpportunity: ScoredOpportunity;
  amountUsd: number;
  reasoning: string;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  gasCostUsd?: number;
  errorMessage?: string;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  netApyCurrent: number;
  totalYieldEarnedUsd: number;
  totalGasSpentUsd: number;
  drawdownPct: number;
  positionCount: number;
  positions: Position[];
  lastSnapshotAt: Date | null;
}

export interface Config {
  id: string;
  riskTolerance: number;
  maxSlippageBps: number;
  maxMovesPerDay: number;
  circuitBreakerPct: number;
  gasBudgetUsdPerDay: number;
  rebalanceThresholdPct: number;
  isPaused: boolean;
  pauseReason: string | null;
  telegramChatId: string | null;
  evmAddress: string | null;
  solanaAddress: string | null;
  bittensorAddress: string | null;
}

export type CapitalTier = "micro" | "small" | "medium" | "large";

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  type: "chain" | "protocol";
  chain?: string;
  apy?: number;
  tvl?: number;
  status: "active" | "evaluating" | "exiting" | "idle";
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}
