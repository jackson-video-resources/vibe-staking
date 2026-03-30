import { useRef, useEffect, useMemo, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Track container size — ForceGraph3D needs explicit px dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setDims({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    if (!portfolio || !opps) return { nodes: [], links: [] };
    return buildGraphData(portfolio.positions ?? [], opps ?? []);
  }, [portfolio, opps]);

  // Slow continuous camera orbit
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;

    const RADIUS = 650;
    const ELEVATION = 80;
    let angle = 0;

    const startDelay = setTimeout(() => {
      const rotate = () => {
        angle += 0.0008;
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

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <ForceGraph3D
        ref={graphRef}
        width={dims.width}
        height={dims.height}
        graphData={graphData}
        backgroundColor="#ffffff"
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

          // Faint halo around chain anchors
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
        linkOpacity={0.12}
        linkWidth={0.2}
        linkColor={() => "#999999"}
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
        d3AlphaDecay={0.003}
        d3VelocityDecay={0.25}
        warmupTicks={120}
        cooldownTicks={Infinity}
      />

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "56px",
          left: "56px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          fontSize: "11px",
          color: "#666",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#16a34a",
              display: "inline-block",
            }}
          />
          Active position
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#0d0d0d",
              display: "inline-block",
            }}
          />
          Being evaluated
        </div>
      </div>
    </div>
  );
}
