import { useRef, useEffect, useMemo } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { buildGraphData } from "../lib/graph-data.js";
import { usePortfolio } from "../hooks/use-portfolio.js";
import { useOpportunities } from "../hooks/use-opportunities.js";

export default function VibeGraph() {
  const { data: portfolio } = usePortfolio();
  const { data: opps } = useOpportunities();
  const graphRef = useRef<any>(null);
  const animRef = useRef<number>(0);

  const graphData = useMemo(() => {
    if (!portfolio || !opps) return { nodes: [], links: [] };
    return buildGraphData(portfolio.positions ?? [], opps ?? []);
  }, [portfolio, opps]);

  // Slow continuous camera orbit — the "always moving" Giza effect
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;

    const RADIUS = 650;
    const ELEVATION = 80;
    let angle = 0;

    // Let the force simulation settle a bit first
    const startDelay = setTimeout(() => {
      const rotate = () => {
        angle += 0.0008; // very slow — full rotation ~2 minutes
        graphRef.current?.cameraPosition({
          x: RADIUS * Math.sin(angle),
          y: ELEVATION,
          z: RADIUS * Math.cos(angle),
        });
        animRef.current = requestAnimationFrame(rotate);
      };
      animRef.current = requestAnimationFrame(rotate);
    }, 2000);

    return () => {
      clearTimeout(startDelay);
      cancelAnimationFrame(animRef.current);
    };
  }, [graphData]);

  if (!portfolio && !opps) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Waiting for data...
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#ffffff"
        // Each node is a sphere — size and colour carry all the meaning
        nodeThreeObject={(node: any) => {
          const isChain = node.type === "chain";
          const isActive = node.status === "active";
          const size = node.val ?? 1;

          const geo = new THREE.SphereGeometry(
            size,
            isChain ? 32 : 6,
            isChain ? 32 : 6,
          );
          const color = isActive ? 0x16a34a : 0x0d0d0d;
          const mat = new THREE.MeshPhongMaterial({
            color,
            shininess: isChain ? 15 : 5,
          });
          const mesh = new THREE.Mesh(geo, mat);

          // Faint halo around chain anchors — the diffuse cloud boundary
          if (isChain) {
            mesh.add(
              new THREE.Mesh(
                new THREE.SphereGeometry(size * 4, 12, 12),
                new THREE.MeshBasicMaterial({
                  color: 0xbbbbbb,
                  transparent: true,
                  opacity: 0.05,
                }),
              ),
            );
          }

          // Green glow ring for active positions
          if (isActive) {
            mesh.add(
              new THREE.Mesh(
                new THREE.SphereGeometry(size * 3, 12, 12),
                new THREE.MeshBasicMaterial({
                  color: 0x16a34a,
                  transparent: true,
                  opacity: 0.12,
                }),
              ),
            );
          }

          return mesh;
        }}
        nodeLabel={(node: any) =>
          `${node.name}${node.apy ? ` — ${node.apy.toFixed(1)}% APY` : ""}`
        }
        // Thin grey lines between anchors and orbiting nodes
        linkOpacity={0.12}
        linkWidth={0.2}
        linkColor={() => "#999999"}
        // No directional particles — the orbital cloud IS the visual
        linkDirectionalParticles={0}
        onNodeClick={(node: any) => {
          if (graphRef.current) {
            const dist = 80;
            const r =
              1 + dist / Math.hypot(node.x ?? 1, node.y ?? 1, node.z ?? 1);
            graphRef.current.cameraPosition(
              {
                x: (node.x ?? 0) * r,
                y: (node.y ?? 0) * r,
                z: (node.z ?? 0) * r,
              },
              node,
              1000,
            );
          }
        }}
        enableNodeDrag={false}
        // Never fully settle — keeps the cloud gently breathing
        d3AlphaDecay={0.003}
        d3VelocityDecay={0.25}
        warmupTicks={120}
        cooldownTicks={Infinity}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />{" "}
          Active position
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-800 inline-block" />{" "}
          Being evaluated
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-black inline-block" /> Chain
          anchor
        </div>
      </div>
    </div>
  );
}
