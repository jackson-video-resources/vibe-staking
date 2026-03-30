import Anthropic from "@anthropic-ai/sdk";
import type { DB } from "../db.js";
import { config, positions } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import type { Move, ScoredOpportunity } from "../../shared/types.js";
import {
  EXECUTABLE_PROTOCOLS,
  SUPPORTED_CHAINS,
} from "../../shared/constants.js";
import { auditAction } from "./yield-scout.js";
import { executeMove } from "./executor.js";

const anthropic = new Anthropic();

interface ClaudeDecision {
  moves: Move[];
  skipReason?: string;
}

// Strip characters that could manipulate Claude's reasoning.
// DeFiLlama pool names/protocols are untrusted external data.
function sanitizePromptString(s: string): string {
  return s.substring(0, 80).replace(/[^\w\s\-./]/g, "");
}

function buildDecisionPrompt(
  currentPositions: Array<{
    protocol: string;
    chain: string;
    apy: number;
    amountUsd: number;
  }>,
  candidates: ScoredOpportunity[],
  portfolioValueUsd: number,
  riskTolerance: number,
  movesRemainingToday: number,
  rebalanceThresholdPct: number,
): string {
  return JSON.stringify({
    portfolioSummary: {
      totalValueUsd: portfolioValueUsd,
      riskTolerance,
      movesRemainingToday,
      rebalanceThresholdPct,
    },
    currentPositions,
    topCandidates: candidates.slice(0, 10).map((c) => ({
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

const SYSTEM_PROMPT = `You are a DeFi yield optimization agent. Analyse the current portfolio and top-scoring opportunities, then decide which moves to make.

Rules:
- Only recommend moves where the improvement is meaningful (above rebalanceThresholdPct)
- Account for implicit gas costs — small improvements at high gas cost are not worth it
- Prefer audited, established protocols over new unaudited ones
- Never recommend more moves than movesRemainingToday
- Reward-heavy APY (token emissions) is less reliable than base APY
- For stablecoin positions, prioritise capital preservation over yield maximisation

Respond ONLY with valid JSON matching this schema:
{
  "moves": [
    {
      "type": "enter" | "exit" | "shift",
      "fromPositionId": "uuid or null if type=enter",
      "toOpportunity": { <full ScoredOpportunity object> },
      "amountUsd": number,
      "reasoning": "brief explanation"
    }
  ],
  "skipReason": "optional string if no moves recommended"
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
      protocol: p.protocol,
      chain: p.chain,
      apy: p.currentApy ?? p.entryApy,
      amountUsd: p.amountUsd,
    })),
    executableCandidates,
    portfolioValueUsd,
    cfg.riskTolerance,
    movesRemainingToday,
    cfg.rebalanceThresholdPct,
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

  if (decision.skipReason || !decision.moves || decision.moves.length === 0) {
    await auditAction(
      db,
      "portfolio-manager",
      "no-action",
      decision.skipReason ?? "Claude returned no moves",
      {},
      tokensUsed,
    );
    return;
  }

  // Validate and execute each move — strict schema checks before any execution
  for (const move of decision.moves) {
    const validTypes = ["enter", "exit", "shift"] as const;
    if (
      !move.type ||
      !validTypes.includes(move.type as (typeof validTypes)[number])
    ) {
      console.warn(
        "[portfolio-manager] Invalid move type, skipping:",
        move.type,
      );
      continue;
    }
    if (!move.toOpportunity || typeof move.toOpportunity !== "object") {
      console.warn("[portfolio-manager] Missing toOpportunity, skipping");
      continue;
    }
    if (!EXECUTABLE_PROTOCOLS.has(move.toOpportunity.protocol)) {
      console.warn(
        "[portfolio-manager] Protocol not in whitelist:",
        move.toOpportunity.protocol,
      );
      continue;
    }
    if (
      !SUPPORTED_CHAINS.includes(
        move.toOpportunity.chain as (typeof SUPPORTED_CHAINS)[number],
      )
    ) {
      console.warn(
        "[portfolio-manager] Chain not supported:",
        move.toOpportunity.chain,
      );
      continue;
    }
    if (!Number.isFinite(move.amountUsd) || move.amountUsd <= 0) {
      console.warn(
        "[portfolio-manager] Invalid amountUsd, skipping:",
        move.amountUsd,
      );
      continue;
    }
    // Cap move size to total portfolio value as a sanity check
    if (move.amountUsd > portfolioValueUsd * 1.1) {
      console.warn(
        "[portfolio-manager] Move amount exceeds portfolio value, skipping:",
        move.amountUsd,
      );
      continue;
    }

    await auditAction(
      db,
      "portfolio-manager",
      "move-decided",
      `${move.type}: ${move.toOpportunity.protocol} on ${move.toOpportunity.chain} — ${move.reasoning}`,
      { move },
      tokensUsed,
    );

    await executeMove(db, move).catch(async (err) => {
      await auditAction(db, "executor", "move-failed", `Move failed: ${err}`, {
        move,
        error: String(err),
      });
    });
  }
}
