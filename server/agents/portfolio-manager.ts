import Anthropic from "@anthropic-ai/sdk";
import type { DB } from "../db.js";
import { config, positions } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import type { ScoredOpportunity } from "../../shared/types.js";
import {
  EXECUTABLE_PROTOCOLS,
  SUPPORTED_CHAINS,
} from "../../shared/constants.js";
import { auditAction } from "./yield-scout.js";
import { executeMove } from "./executor.js";

const anthropic = new Anthropic();

interface TargetSlot {
  protocol: string;
  chain: string;
  pct: number;
  reasoning: string;
}

interface ClaudeDecision {
  targetAllocation: TargetSlot[];
  skipReason?: string | null;
}

// Strip characters that could manipulate Claude's reasoning.
// DeFiLlama pool names/protocols are untrusted external data.
function sanitizePromptString(s: string): string {
  return s.substring(0, 80).replace(/[^\w\s\-./]/g, "");
}

function buildDecisionPrompt(
  currentPositions: Array<{
    id: string;
    protocol: string;
    chain: string;
    apy: number;
    amountUsd: number;
  }>,
  candidates: ScoredOpportunity[],
  portfolioValueUsd: number,
  riskTolerance: number,
  movesRemainingToday: number,
): string {
  const currentAllocation = currentPositions.map((p) => ({
    id: p.id,
    protocol: sanitizePromptString(p.protocol),
    chain: sanitizePromptString(p.chain),
    pct:
      portfolioValueUsd > 0
        ? Math.round((p.amountUsd / portfolioValueUsd) * 100)
        : 0,
    apy: Number(p.apy.toFixed(4)),
  }));

  return JSON.stringify({
    portfolioSummary: {
      totalValueUsd: portfolioValueUsd,
      riskTolerance,
      movesRemainingToday,
    },
    currentAllocation,
    topCandidates: candidates.slice(0, 15).map((c) => ({
      protocol: sanitizePromptString(c.protocol),
      chain: sanitizePromptString(c.chain),
      symbol: sanitizePromptString(c.symbol),
      apy: Number(c.apy.toFixed(4)),
      apyMean30d:
        c.apyMean30d != null ? Number(c.apyMean30d.toFixed(4)) : undefined,
      tvlUsd: Math.round(c.tvlUsd),
      riskScore: c.riskScore,
      vibeScore: c.vibeScore,
      stablecoin: Boolean(c.stablecoin),
      ilRisk: sanitizePromptString(String(c.ilRisk ?? "none")),
    })),
  });
}

const SYSTEM_PROMPT = `You are a DeFi yield optimization agent managing a diversified portfolio across multiple protocols simultaneously.

Your job is to recommend a TARGET ALLOCATION — what percentage of capital should be in each protocol right now.

Rules:
- Always recommend 3-5 concurrent positions (diversification reduces risk)
- Allocations must sum to 100%
- No single position > 40% of portfolio
- Prefer spreading risk: mix chains (EVM + Solana where capital allows), mix stable vs volatile
- Only use protocols in the executable list
- Account for gas costs — small rebalances on Ethereum mainnet are not worth it
- Stablecoin positions are safer; weight them higher for lower risk tolerance
- Reward-heavy APY (token emissions) is less reliable than base APY
- For micro capital (<$1000): max 2 positions, prefer Arbitrum/Base/Solana (low gas)

Return JSON in this exact shape:
{
  "targetAllocation": [
    { "protocol": "aave-v3", "chain": "Arbitrum", "pct": 35, "reasoning": "..." },
    { "protocol": "morpho", "chain": "Base", "pct": 25, "reasoning": "..." },
    { "protocol": "jito", "chain": "Solana", "pct": 40, "reasoning": "..." }
  ],
  "skipReason": null
}

Or if no rebalance needed:
{
  "targetAllocation": [],
  "skipReason": "Current allocation is within 2% of optimal. No action needed."
}`;

export async function runPortfolioDecision(
  db: DB,
  executableCandidates: ScoredOpportunity[],
): Promise<void> {
  const [cfg] = await db.select().from(config).limit(1);
  if (!cfg || cfg.isPaused) return;

  const activePositions = await db
    .select()
    .from(positions)
    .where(eq(positions.status, "active"));

  if (activePositions.length === 0 && executableCandidates.length === 0) return;

  const portfolioValueUsd = activePositions.reduce(
    (s, p) => s + p.amountUsd,
    0,
  );

  // Check if any candidate meaningfully beats current positions
  const currentAvgApy =
    portfolioValueUsd > 0
      ? activePositions.reduce(
          (s, p) => s + (p.currentApy ?? p.entryApy) * p.amountUsd,
          0,
        ) / portfolioValueUsd
      : 0;

  const bestCandidate = executableCandidates[0];
  if (
    bestCandidate &&
    bestCandidate.apy - currentAvgApy < cfg.rebalanceThresholdPct &&
    activePositions.length > 0
  ) {
    // No meaningful improvement — skip Claude call entirely
    await auditAction(
      db,
      "portfolio-manager",
      "no-action",
      `Best candidate APY ${bestCandidate.apy.toFixed(1)}% vs current ${currentAvgApy.toFixed(1)}% — below threshold`,
    );
    return;
  }

  // Rate limit check
  const { checkRateLimit } = await import("../safety/rate-limiter.js");
  const { allowed, movesRemainingToday } = await checkRateLimit(db);
  if (!allowed) {
    await auditAction(
      db,
      "portfolio-manager",
      "rate-limited",
      "Daily move limit reached",
    );
    return;
  }

  // Call Claude
  const prompt = buildDecisionPrompt(
    activePositions.map((p) => ({
      id: p.id,
      protocol: p.protocol,
      chain: p.chain,
      apy: p.currentApy ?? p.entryApy,
      amountUsd: p.amountUsd,
    })),
    executableCandidates,
    portfolioValueUsd,
    cfg.riskTolerance,
    movesRemainingToday,
  );

  let decision: ClaudeDecision;
  let tokensUsed = 0;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const raw = response.content[0];
    if (raw.type !== "text")
      throw new Error("Unexpected response type from Claude");

    // Extract JSON — handle markdown code blocks
    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Claude response");

    decision = JSON.parse(jsonMatch[0]) as ClaudeDecision;
  } catch (err) {
    await auditAction(
      db,
      "portfolio-manager",
      "claude-error",
      `Claude call failed: ${err}`,
      { error: String(err) },
      tokensUsed,
    );
    return;
  }

  if (
    decision.skipReason ||
    !decision.targetAllocation ||
    decision.targetAllocation.length === 0
  ) {
    await auditAction(
      db,
      "portfolio-manager",
      "no-action",
      decision.skipReason ?? "Claude returned no target allocation",
      {},
      tokensUsed,
    );
    return;
  }

  // Validate target allocation slots
  const validSlots: TargetSlot[] = [];
  let pctTotal = 0;

  for (const slot of decision.targetAllocation) {
    if (!slot.protocol || typeof slot.protocol !== "string") {
      console.warn("[portfolio-manager] Slot missing protocol, skipping");
      continue;
    }
    if (!EXECUTABLE_PROTOCOLS.has(slot.protocol)) {
      console.warn(
        "[portfolio-manager] Protocol not in whitelist:",
        slot.protocol,
      );
      continue;
    }
    if (
      !SUPPORTED_CHAINS.includes(
        slot.chain as (typeof SUPPORTED_CHAINS)[number],
      )
    ) {
      console.warn("[portfolio-manager] Chain not supported:", slot.chain);
      continue;
    }
    if (!Number.isFinite(slot.pct) || slot.pct <= 0 || slot.pct > 100) {
      console.warn("[portfolio-manager] Invalid pct, skipping:", slot.pct);
      continue;
    }
    validSlots.push(slot);
    pctTotal += slot.pct;
  }

  if (validSlots.length === 0) {
    await auditAction(
      db,
      "portfolio-manager",
      "no-action",
      "All target slots failed validation",
      {},
      tokensUsed,
    );
    return;
  }

  // Compute delta: current positions vs target allocation
  // Key: "protocol:chain"
  const currentMap = new Map(
    activePositions.map((p) => [`${p.protocol}:${p.chain}`, p]),
  );
  const targetMap = new Map(
    validSlots.map((s) => [`${s.protocol}:${s.chain}`, s]),
  );

  // Build moves: exits first, then entries/adjustments
  const movesToExecute: Array<{
    type: "enter" | "exit" | "shift";
    fromPositionId: string | null;
    toOpportunity: ScoredOpportunity | null;
    amountUsd: number;
    reasoning: string;
  }> = [];

  // Exit positions not in target
  for (const [key, pos] of currentMap) {
    if (!targetMap.has(key)) {
      movesToExecute.push({
        type: "exit",
        fromPositionId: pos.id,
        toOpportunity: null,
        amountUsd: pos.amountUsd,
        reasoning: `Exiting ${pos.protocol} on ${pos.chain} — not in target allocation`,
      });
    }
  }

  // Enter/adjust positions in target
  for (const [key, slot] of targetMap) {
    const targetUsd =
      portfolioValueUsd > 0 ? (slot.pct / pctTotal) * portfolioValueUsd : 0;
    const existing = currentMap.get(key);

    // Find the opportunity in candidates
    const opportunity = executableCandidates.find(
      (c) => c.protocol === slot.protocol && c.chain === slot.chain,
    ) ?? {
      protocol: slot.protocol,
      chain: slot.chain,
      symbol: "",
      apy: 0,
      tvlUsd: 0,
      riskScore: 5,
      vibeScore: 5,
      stablecoin: false,
      ilRisk: null,
      apyMean30d: null,
      poolId: "",
    };

    if (!existing) {
      // New entry
      if (targetUsd <= 0) continue;
      if (!Number.isFinite(targetUsd) || targetUsd > portfolioValueUsd * 1.1) {
        console.warn(
          "[portfolio-manager] Target amount out of range, skipping:",
          targetUsd,
        );
        continue;
      }
      movesToExecute.push({
        type: "enter",
        fromPositionId: null,
        toOpportunity: opportunity as ScoredOpportunity,
        amountUsd: targetUsd,
        reasoning: slot.reasoning,
      });
    } else {
      // Adjust existing — only if delta is meaningful (>5% of portfolio)
      const delta = targetUsd - existing.amountUsd;
      if (Math.abs(delta) / portfolioValueUsd > 0.05) {
        movesToExecute.push({
          type: "shift",
          fromPositionId: existing.id,
          toOpportunity: opportunity as ScoredOpportunity,
          amountUsd: targetUsd,
          reasoning: `Adjusting ${slot.protocol} on ${slot.chain}: ${existing.amountUsd.toFixed(0)} → ${targetUsd.toFixed(0)} USD`,
        });
      }
    }
  }

  if (movesToExecute.length === 0) {
    await auditAction(
      db,
      "portfolio-manager",
      "no-action",
      "Target allocation matches current within tolerance — no moves needed",
      {},
      tokensUsed,
    );
    return;
  }

  // Execute exits first, then entries/shifts
  const exits = movesToExecute.filter((m) => m.type === "exit");
  const entries = movesToExecute.filter((m) => m.type !== "exit");

  for (const move of [...exits, ...entries]) {
    await auditAction(
      db,
      "portfolio-manager",
      "move-decided",
      `${move.type}: ${move.toOpportunity?.protocol ?? move.fromPositionId} — ${move.reasoning}`,
      { move },
      tokensUsed,
    );

    // Build a Move-compatible object for the executor
    const execMove = {
      type: move.type,
      fromPositionId: move.fromPositionId,
      toOpportunity: move.toOpportunity,
      amountUsd: move.amountUsd,
      reasoning: move.reasoning,
    };

    await executeMove(db, execMove as Parameters<typeof executeMove>[1]).catch(
      async (err) => {
        await auditAction(
          db,
          "executor",
          "move-failed",
          `Move failed: ${err}`,
          { move, error: String(err) },
        );
      },
    );
  }
}
