import type { DB } from "../db.js";
import {
  opportunities,
  portfolioSnapshots,
  positions,
  auditLog,
  config,
} from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import type { LlamaPool, ScoredOpportunity } from "../../shared/types.js";
import {
  DEFILLAMA_POOLS_URL,
  EXECUTABLE_PROTOCOLS,
  MIN_TVL_USD,
  MAX_APY_SANITY,
  MIN_APY_MEAN_30D,
} from "../../shared/constants.js";
import { scoreOpportunities } from "./risk-model.js";
import { runPortfolioDecision } from "./portfolio-manager.js";

// Fetch all pools from DeFiLlama (free, no API key)
async function fetchLlamaPools(): Promise<LlamaPool[]> {
  const res = await fetch(DEFILLAMA_POOLS_URL, {
    headers: { "User-Agent": "vibe-staking/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`DeFiLlama returned ${res.status}`);
  const json = (await res.json()) as { data: LlamaPool[] };
  return json.data;
}

// Sanity-filter pools before scoring
function filterPools(pools: LlamaPool[]): LlamaPool[] {
  return pools.filter((p) => {
    if (!p.apy || p.apy <= 0 || p.apy > MAX_APY_SANITY) return false;
    if (p.tvlUsd < MIN_TVL_USD) return false;
    if (p.apyMean30d !== null && p.apyMean30d < MIN_APY_MEAN_30D) return false;
    return true;
  });
}

// Compute vibeScore (0-100) — pure math, no LLM
function computeVibeScore(
  pool: LlamaPool,
  riskTolerance: number, // 1-10
): number {
  const maxApy = 200; // normalise against 200% APY ceiling
  const normalizedApy = Math.min(pool.apy / maxApy, 1);

  // Stability score from sigma (lower sigma = more stable)
  const sigma = pool.sigma ?? 1;
  const stabilityScore = Math.max(0, 1 - sigma / 2);

  // TVL score (log scale, normalised against $1B)
  const tvlScore = Math.min(Math.log10(pool.tvlUsd) / 9, 1);

  // Weights shift with risk tolerance
  const apyWeight = 0.3 + (riskTolerance / 10) * 0.4; // 0.3–0.7
  const stabilityWeight = 0.5 - (riskTolerance / 10) * 0.3; // 0.5–0.2
  const tvlWeight = 0.2 - (riskTolerance / 10) * 0.1; // 0.2–0.1

  let score =
    apyWeight * normalizedApy +
    stabilityWeight * stabilityScore +
    tvlWeight * tvlScore;

  // Bonuses and penalties
  if (pool.stablecoin) score += 0.05;
  if (pool.ilRisk === "yes") score -= 0.1 * (1 - riskTolerance / 15);
  if (pool.apyReward && pool.apyBase && pool.apyReward > pool.apyBase * 2) {
    score -= 0.05; // Reward-heavy APY is less sustainable
  }

  return Math.max(0, Math.min(100, score * 100));
}

export async function runScanCycle(db: DB): Promise<void> {
  console.log("[yield-scout] Starting scan cycle...");

  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg || cfg.isPaused) {
    console.log("[yield-scout] Paused, skipping scan");
    return;
  }

  // Get current portfolio value for capital-tier calculations
  const [latestSnapshot] = await db
    .select()
    .from(portfolioSnapshots)
    .orderBy(desc(portfolioSnapshots.timestamp))
    .limit(1);
  const portfolioValueUsd = latestSnapshot?.totalValueUsd ?? 0;

  let rawPools: LlamaPool[];
  try {
    rawPools = await fetchLlamaPools();
  } catch (err) {
    console.error("[yield-scout] Failed to fetch DeFiLlama:", err);
    await auditAction(
      db,
      "yield-scout",
      "scan-failed",
      "DeFiLlama fetch failed",
      { error: String(err) },
    );
    return;
  }

  const filtered = filterPools(rawPools);
  console.log(
    `[yield-scout] ${filtered.length} pools after sanity filter (from ${rawPools.length} total)`,
  );

  // Score each pool
  const scored: ScoredOpportunity[] = filtered.map((pool) => ({
    llamaPoolId: pool.pool,
    chain: pool.chain,
    protocol: pool.project,
    symbol: pool.symbol,
    tvlUsd: pool.tvlUsd,
    apy: pool.apy,
    apyBase: pool.apyBase,
    apyReward: pool.apyReward,
    apyMean30d: pool.apyMean30d,
    stablecoin: pool.stablecoin,
    ilRisk: pool.ilRisk,
    riskScore: 0, // filled by risk-model
    vibeScore: computeVibeScore(pool, cfg.riskTolerance),
    executable: EXECUTABLE_PROTOCOLS.has(pool.project),
  }));

  // Apply risk model
  const riskScored = scoreOpportunities(
    scored,
    cfg.riskTolerance,
    portfolioValueUsd,
  );

  // Upsert top 500 opportunities to DB
  const top500 = riskScored
    .sort((a, b) => b.vibeScore - a.vibeScore)
    .slice(0, 500);

  for (const opp of top500) {
    await db
      .insert(opportunities)
      .values({
        llamaPoolId: opp.llamaPoolId,
        chain: opp.chain,
        protocol: opp.protocol,
        symbol: opp.symbol,
        tvlUsd: opp.tvlUsd,
        apy: opp.apy,
        apyBase: opp.apyBase,
        apyReward: opp.apyReward,
        apyMean30d: opp.apyMean30d,
        stablecoin: opp.stablecoin,
        ilRisk: opp.ilRisk,
        riskScore: opp.riskScore,
        vibeScore: opp.vibeScore,
        executable: opp.executable,
        scannedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: opportunities.llamaPoolId,
        set: {
          apy: opp.apy,
          apyBase: opp.apyBase,
          apyReward: opp.apyReward,
          tvlUsd: opp.tvlUsd,
          riskScore: opp.riskScore,
          vibeScore: opp.vibeScore,
          scannedAt: new Date(),
        },
      });
  }

  await auditAction(
    db,
    "yield-scout",
    "scan-complete",
    `Scanned ${filtered.length} pools, stored top ${top500.length}`,
    {
      totalPools: rawPools.length,
      afterFilter: filtered.length,
      stored: top500.length,
      topApy: top500[0]?.apy,
      topVibeScore: top500[0]?.vibeScore,
    },
  );

  // Trigger portfolio decision if there are executable opportunities
  const executableCandidates = riskScored
    .filter((o) => o.executable)
    .slice(0, 20);
  if (executableCandidates.length > 0) {
    await runPortfolioDecision(db, executableCandidates).catch(console.error);
  }
}

export async function takeSnapshot(db: DB): Promise<void> {
  const activePositions = await db
    .select()
    .from(positions)
    .where(eq(positions.status, "active"));

  const totalValueUsd = activePositions.reduce((s, p) => s + p.amountUsd, 0);
  const weightedApy =
    totalValueUsd > 0
      ? activePositions.reduce(
          (s, p) => s + (p.currentApy ?? p.entryApy) * p.amountUsd,
          0,
        ) / totalValueUsd
      : 0;

  const [prev] = await db
    .select()
    .from(portfolioSnapshots)
    .orderBy(desc(portfolioSnapshots.timestamp))
    .limit(1);

  const highWaterMark = Math.max(totalValueUsd, prev?.highWaterMarkUsd ?? 0);
  const drawdownPct =
    highWaterMark > 0
      ? ((highWaterMark - totalValueUsd) / highWaterMark) * 100
      : 0;

  const chainBreakdown: Record<string, number> = {};
  for (const p of activePositions) {
    chainBreakdown[p.chain] = (chainBreakdown[p.chain] ?? 0) + p.amountUsd;
  }

  await db.insert(portfolioSnapshots).values({
    totalValueUsd,
    netApyCurrent: weightedApy,
    highWaterMarkUsd: highWaterMark,
    drawdownPct,
    positionCount: activePositions.length,
    chainBreakdown,
  });
}

export async function auditAction(
  db: DB,
  agent: string,
  action: string,
  summary: string,
  details?: Record<string, unknown>,
  claudeTokensUsed?: number,
): Promise<void> {
  await db.insert(auditLog).values({
    agent,
    action,
    summary,
    details: details ?? null,
    claudeTokensUsed: claudeTokensUsed ?? null,
  });
}
