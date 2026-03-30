import { GRAPH_COLORS } from "@shared/constants.js";
import type { GraphNode, GraphLink } from "@shared/types.js";

interface Position {
  protocol: string;
  chain: string;
  amountUsd: number;
  currentApy: number | null;
  entryApy: number;
  status: string;
}

interface Opportunity {
  protocol: string;
  chain: string;
  tvlUsd: number;
  apy: number;
  vibeScore: number | null;
  executable: boolean;
}

const CHAIN_IDS = [
  "Ethereum",
  "Arbitrum",
  "Base",
  "Optimism",
  "Solana",
  "Bittensor",
  "Polygon",
  "BSC",
  "Avalanche",
];

export function buildGraphData(
  positions: Position[],
  opportunities: Opportunity[],
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, boolean>();

  // Add chain anchor nodes
  const activeChains = new Set([
    ...positions.map((p) => p.chain),
    ...opportunities
      .filter((o) => o.vibeScore && o.vibeScore > 50)
      .map((o) => o.chain),
  ]);

  for (const chain of activeChains) {
    const id = `chain:${chain}`;
    if (!nodeMap.has(id)) {
      nodes.push({
        id,
        name: chain,
        val: 20,
        color: GRAPH_COLORS.chain,
        type: "chain",
        chain,
        status: "idle",
      });
      nodeMap.set(id, true);
    }
  }

  // Add active position nodes
  for (const pos of positions) {
    const id = `pos:${pos.protocol}:${pos.chain}`;
    if (!nodeMap.has(id)) {
      nodes.push({
        id,
        name: pos.protocol,
        val: Math.max(5, Math.sqrt(pos.amountUsd) / 5),
        color:
          pos.status === "exiting" ? GRAPH_COLORS.exiting : GRAPH_COLORS.active,
        type: "protocol",
        chain: pos.chain,
        apy: pos.currentApy ?? pos.entryApy,
        status: pos.status === "exiting" ? "exiting" : "active",
      });
      nodeMap.set(id, true);

      // Link to chain
      links.push({
        source: `chain:${pos.chain}`,
        target: id,
        value: pos.amountUsd / 1000,
      });
    }
  }

  // Add top opportunity nodes (not already active positions)
  const activeProtocols = new Set(
    positions.map((p) => `${p.protocol}:${p.chain}`),
  );
  const topOpps = opportunities
    .filter((o) => o.executable && o.vibeScore && o.vibeScore > 60)
    .filter((o) => !activeProtocols.has(`${o.protocol}:${o.chain}`))
    .slice(0, 15);

  for (const opp of topOpps) {
    const id = `opp:${opp.protocol}:${opp.chain}`;
    if (!nodeMap.has(id)) {
      nodes.push({
        id,
        name: opp.protocol,
        val: Math.max(3, Math.log10(opp.tvlUsd) * 2),
        color: GRAPH_COLORS.evaluating,
        type: "protocol",
        chain: opp.chain,
        apy: opp.apy,
        tvl: opp.tvlUsd,
        status: "evaluating",
      });
      nodeMap.set(id, true);

      // Link to chain
      const chainId = `chain:${opp.chain}`;
      if (nodeMap.has(chainId)) {
        links.push({ source: chainId, target: id, value: 1 });
      }
    }
  }

  return { nodes, links };
}
