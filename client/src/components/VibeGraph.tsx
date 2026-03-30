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
  idle: 0x475569,
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

  // Auto-rotate camera
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.cameraPosition({ x: 0, y: 0, z: 300 });
  }, []);

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
        nodeThreeObject={(node: any) => {
          const size = node.val ?? 5;
          const geometry = new THREE.SphereGeometry(size, 16, 16);
          const color = STATUS_COLORS[node.status] ?? STATUS_COLORS.idle;
          const material = new THREE.MeshPhongMaterial({
            color,
            transparent: true,
            opacity: node.type === "chain" ? 0.9 : 0.75,
            shininess: 80,
          });
          const mesh = new THREE.Mesh(geometry, material);

          // Add glow for active positions
          if (node.status === "active") {
            const glowGeom = new THREE.SphereGeometry(size * 1.4, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
              color: 0x22c55e,
              transparent: true,
              opacity: 0.12,
            });
            mesh.add(new THREE.Mesh(glowGeom, glowMat));
          }

          return mesh;
        }}
        nodeLabel={(node: any) =>
          `${node.name}${node.apy ? ` — ${node.apy.toFixed(1)}% APY` : ""}`
        }
        // The "pollination" particle effect — capital flowing between nodes
        linkDirectionalParticles={3}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={(link: any) =>
          link.value > 5 ? "#22c55e" : "#6366f1"
        }
        linkOpacity={0.2}
        linkWidth={0.5}
        linkColor={() => "#334155"}
        onNodeClick={(node: any) => {
          if (graphRef.current) {
            const distance = 80;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
            graphRef.current.cameraPosition(
              {
                x: node.x * distRatio,
                y: node.y * distRatio,
                z: node.z * distRatio,
              },
              node,
              1000,
            );
          }
        }}
        enableNodeDrag={false}
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
