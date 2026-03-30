import type { ScoredOpportunity } from "../../shared/types.js";
import { CAPITAL_TIERS, MIN_TVL_USD_LARGE } from "../../shared/constants.js";

// High-risk chains get a penalty
const CHAIN_RISK: Record<string, number> = {
  Ethereum: 0,
  Arbitrum: 5,
  Base: 5,
  Optimism: 5,
  Polygon: 10,
  BSC: 15,
  Avalanche: 10,
  Solana: 12,
  Bittensor: 20,
};

// Known-audited protocols get a bonus
const AUDITED_PROTOCOLS = new Set([
  "aave-v3",
  "lido",
  "compound-v3",
  "uniswap-v3",
  "curve",
  "yearn-v3",
  "marinade-finance",
  "jito",
]);

// Compute riskScore (0-100, lower is safer)
function computeRiskScore(
  opp: ScoredOpportunity,
  capitalUsd: number,
  riskTolerance: number,
): number {
  let score = 0;

  // Chain risk
  score += CHAIN_RISK[opp.chain] ?? 20;

  // Impermanent loss risk
  if (opp.ilRisk === "yes") score += 15;

  // Reward-heavy APY is less sustainable (inflated by token emissions)
  if (opp.apyReward && opp.apyBase !== null && opp.apyBase !== undefined) {
    const rewardRatio = opp.apyReward / (opp.apy || 1);
    if (rewardRatio > 0.7) score += 10; // >70% from rewards
  }

  // APY volatility (sigma)
  // Managed externally via vibeScore; here we just flag extreme values

  // TVL risk
  if (opp.tvlUsd < 5_000_000) score += 10;
  else if (opp.tvlUsd < 1_000_000) score += 20;

  // Audited protocol bonus
  if (AUDITED_PROTOCOLS.has(opp.protocol)) score -= 10;

  // APY that's suspiciously high even for its category
  if (!opp.stablecoin && opp.apy > 100) score += 15;
  if (opp.stablecoin && opp.apy > 30) score += 10;

  // Capital-tier adjustments
  score += capitalTierAdjustments(opp, capitalUsd);

  return Math.max(0, Math.min(100, score));
}

function capitalTierAdjustments(
  opp: ScoredOpportunity,
  capitalUsd: number,
): number {
  let adjustment = 0;

  if (capitalUsd <= CAPITAL_TIERS.micro.max) {
    // Micro: heavily penalise Ethereum mainnet (gas kills returns)
    if (opp.chain === "Ethereum") adjustment += 30;
    // Prefer stablecoins at micro tier
    if (!opp.stablecoin) adjustment += 10;
  } else if (capitalUsd <= CAPITAL_TIERS.small.max) {
    if (opp.chain === "Ethereum") adjustment += 15;
  } else if (capitalUsd >= CAPITAL_TIERS.large.min) {
    // Large capital: penalise low-TVL pools (concentration risk)
    if (opp.tvlUsd < MIN_TVL_USD_LARGE) adjustment += 15;
  }

  return adjustment;
}

// Filter opportunities based on risk tolerance
export function scoreOpportunities(
  opps: ScoredOpportunity[],
  riskTolerance: number,
  capitalUsd: number,
): ScoredOpportunity[] {
  // Max risk score allowed based on tolerance (1=very safe, 10=degen)
  const maxRiskScore = 20 + riskTolerance * 8; // range: 28 (safe) to 100 (degen)

  return opps
    .map((opp) => ({
      ...opp,
      riskScore: computeRiskScore(opp, capitalUsd, riskTolerance),
    }))
    .filter((opp) => opp.riskScore <= maxRiskScore);
}
