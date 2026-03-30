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

const CHAIN_LIST = [
  "Ethereum",
  "Arbitrum",
  "Base",
  "Solana",
  "Bittensor",
  "Optimism",
  "Polygon",
  "Avalanche",
  "BSC",
];

export function buildGraphData(
  positions: Position[],
  opportunities: Opportunity[],
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, boolean>();

  // Collect active chains
  const activeChains = new Set([
    ...positions.map((p) => p.chain),
    ...opportunities.filter((o) => (o.vibeScore ?? 0) > 40).map((o) => o.chain),
  ]);

  // Chain anchor nodes — large black spheres
  for (const chain of activeChains) {
    const id = `chain:${chain}`;
    if (!nodeMap.has(id)) {
      nodes.push({
        id,
        name: chain,
        val: 22,
        type: "chain",
        chain,
        status: "chain",
        color: "#0a0a0a",
      });
      nodeMap.set(id, true);
    }
  }

  // Active position nodes — medium, green
  for (const pos of positions) {
    const id = `pos:${pos.protocol}:${pos.chain}`;
    if (!nodeMap.has(id)) {
      nodes.push({
        id,
        name: pos.protocol,
        val: Math.max(4, Math.sqrt(pos.amountUsd) / 8),
        type: "protocol",
        chain: pos.chain,
        apy: pos.currentApy ?? pos.entryApy,
        status: pos.status === "exiting" ? "exiting" : "active",
        color: "#16a34a",
      });
      nodeMap.set(id, true);
      links.push({
        source: `chain:${pos.chain}`,
        target: id,
        value: pos.amountUsd / 1000,
        type: "active",
      });
    }
  }

  // Opportunity nodes — varied sizes, black, orbiting their chain anchors
  const activeProtos = new Set(
    positions.map((p) => `${p.protocol}:${p.chain}`),
  );
  const opps = opportunities
    .filter((o) => !activeProtos.has(`${o.protocol}:${o.chain}`))
    .slice(0, 250); // cap for performance

  for (let i = 0; i < opps.length; i++) {
    const opp = opps[i];
    const id = `opp:${opp.protocol}:${opp.chain}:${i}`;
    if (!nodeMap.has(id) && nodeMap.has(`chain:${opp.chain}`)) {
      // Size varies: TVL-based with a long tail of tiny dots — creates the orbital cloud
      const logTvl = Math.log10(Math.max(opp.tvlUsd, 1));
      const size =
        opp.tvlUsd > 500_000_000
          ? logTvl * 1.4 // large protocol
          : opp.tvlUsd > 50_000_000
            ? logTvl * 0.8 // medium
            : Math.random() * 1.5 + 0.4; // tiny satellite dot

      nodes.push({
        id,
        name: opp.protocol,
        val: size,
        type: "protocol",
        chain: opp.chain,
        apy: opp.apy,
        status: "evaluating",
        color: "#111111",
      });
      nodeMap.set(id, true);
      links.push({
        source: `chain:${opp.chain}`,
        target: id,
        value: 1,
        type: "opportunity",
      });
    }
  }

  return { nodes, links };
}
