import { useRef, useEffect, useMemo } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { buildGraphData } from "../lib/graph-data.js";
import { usePortfolio } from "../hooks/use-portfolio.js";
import { useOpportunities } from "../hooks/use-opportunities.js";

const STATUS_COLORS: Record<string, number> = {
  active: 0x22c55e,
  evaluating: 0xeab308,
  exiting: 0xef4444,
  idle: 0x334155,
  chain: 0x6366f1,
};

export default function VibeGraph() {
  const { data: portfolio } = usePortfolio();
  const { data: opps } = useOpportunities();
  const graphRef = useRef<any>(null);

  const graphData = useMemo(() => {
    if (!portfolio || !opps) return { nodes: [], links: [] };
    return buildGraphData(portfolio.positions ?? [], opps ?? []);
  }, [portfolio, opps]);

  // Pull camera back far enough to see the full cloud
  useEffect(() => {
    if (!graphRef.current) return;
    const timer = setTimeout(() => {
      graphRef.current?.cameraPosition({ x: 0, y: 0, z: 600 });
    }, 300);
    return () => clearTimeout(timer);
  }, [graphData]);

  if (!portfolio && !opps) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Waiting for data...
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#0f172a"
        // Node rendering — chain anchors are large, protocols are small dots
        nodeThreeObject={(node: any) => {
          const isChain = node.type === "chain";
          const size = isChain ? 18 : Math.max(1.5, node.val ?? 3);
          const geometry = new THREE.SphereGeometry(
            size,
            isChain ? 32 : 8,
            isChain ? 32 : 8,
          );
          const color = STATUS_COLORS[node.status] ?? STATUS_COLORS.idle;
          const material = new THREE.MeshPhongMaterial({
            color,
            transparent: true,
            opacity: isChain ? 1.0 : node.status === "active" ? 0.95 : 0.6,
            shininess: isChain ? 120 : 40,
            emissive:
              node.status === "active"
                ? new THREE.Color(0x22c55e)
                : new THREE.Color(0x000000),
            emissiveIntensity: node.status === "active" ? 0.3 : 0,
          });
          const mesh = new THREE.Mesh(geometry, material);

          // Glow shell for active positions
          if (node.status === "active") {
            const glowGeom = new THREE.SphereGeometry(size * 2.2, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
              color: 0x22c55e,
              transparent: true,
              opacity: 0.08,
            });
            mesh.add(new THREE.Mesh(glowGeom, glowMat));
          }

          // Extra outer glow for chain anchors
          if (isChain) {
            const outerGeom = new THREE.SphereGeometry(size * 2.8, 16, 16);
            const outerMat = new THREE.MeshBasicMaterial({
              color: 0x6366f1,
              transparent: true,
              opacity: 0.06,
            });
            mesh.add(new THREE.Mesh(outerGeom, outerMat));
          }

          return mesh;
        }}
        nodeLabel={(node: any) =>
          `${node.name}${node.apy ? ` — ${node.apy.toFixed(1)}% APY` : ""}`
        }
        // Dense particle streams — the "pollination" capital-flowing effect
        linkDirectionalParticles={(link: any) => {
          // More particles on high-value links
          return link.value > 10 ? 12 : link.value > 3 ? 8 : 4;
        }}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleWidth={(link: any) => (link.value > 5 ? 2 : 1)}
        linkDirectionalParticleColor={(link: any) =>
          link.type === "active"
            ? "#22c55e"
            : link.type === "cross"
              ? "#a855f7"
              : "#6366f1"
        }
        linkOpacity={0.15}
        linkWidth={(link: any) => (link.value > 5 ? 1.5 : 0.3)}
        linkColor={(link: any) =>
          link.type === "active" ? "#22c55e" : "#1e293b"
        }
        onNodeClick={(node: any) => {
          if (graphRef.current) {
            const distance = 100;
            const distRatio =
              1 + distance / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1);
            graphRef.current.cameraPosition(
              {
                x: (node.x ?? 0) * distRatio,
                y: (node.y ?? 0) * distRatio,
                z: (node.z ?? 0) * distRatio,
              },
              node,
              1200,
            );
          }
        }}
        enableNodeDrag={false}
        d3AlphaDecay={0.008}
        d3VelocityDecay={0.25}
        warmupTicks={80}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{" "}
          Active position
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />{" "}
          Being evaluated
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{" "}
          Exiting
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />{" "}
          Chain anchor
        </div>
      </div>
    </div>
  );
}
