import type { GraphLink } from "@shared/types.js";

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

// Fixed 3D positions for chain anchors — spread across a sphere so they never collapse
const CHAIN_POSITIONS: Record<string, [number, number, number]> = {
  Ethereum: [320, 40, 0],
  Arbitrum: [100, -80, 300],
  Base: [-200, 60, 260],
  Solana: [-340, -20, 40],
  Bittensor: [-100, 160, -280],
  Optimism: [180, -150, -240],
  Polygon: [0, 280, -80],
  Avalanche: [240, -200, 100],
  BSC: [-60, -280, -120],
};

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  type: "chain" | "protocol";
  chain?: string;
  apy?: number;
  tvl?: number;
  status: "active" | "evaluating" | "exiting" | "idle" | "chain";
  // Fixed positions for chain anchors (d3-force pin)
  fx?: number;
  fy?: number;
  fz?: number;
}

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

  // Chain anchor nodes — pinned at fixed sphere positions
  for (const chain of activeChains) {
    const id = `chain:${chain}`;
    if (!nodeMap.has(id)) {
      const [fx, fy, fz] = CHAIN_POSITIONS[chain] ?? [
        Math.random() * 600 - 300,
        Math.random() * 600 - 300,
        Math.random() * 600 - 300,
      ];
      nodes.push({
        id,
        name: chain,
        val: 18,
        type: "chain",
        chain,
        status: "chain",
        color: "#0a0a0a",
        fx,
        fy,
        fz,
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
        val: Math.max(5, Math.sqrt(pos.amountUsd) / 6),
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

  // Opportunity nodes — orbiting satellites, cap at 300 for perf
  const activeProtos = new Set(
    positions.map((p) => `${p.protocol}:${p.chain}`),
  );
  const opps = opportunities
    .filter((o) => !activeProtos.has(`${o.protocol}:${o.chain}`))
    .slice(0, 300);

  for (let i = 0; i < opps.length; i++) {
    const opp = opps[i];
    const id = `opp:${opp.protocol}:${opp.chain}:${i}`;
    if (!nodeMap.has(id) && nodeMap.has(`chain:${opp.chain}`)) {
      const logTvl = Math.log10(Math.max(opp.tvlUsd, 1));
      const size =
        opp.tvlUsd > 500_000_000
          ? logTvl * 1.2
          : opp.tvlUsd > 50_000_000
            ? logTvl * 0.7
            : Math.random() * 1.2 + 0.3;

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
