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

  // Track container pixel size — ForceGraph3D ignores CSS, needs explicit numbers
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

  // After data loads: apply orbital cloud forces — strong repulsion + spread link distance
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;
    const fg = graphRef.current;

    const applyForces = () => {
      // Strong repulsion: spreads nodes far apart from each other
      const charge = fg.d3Force("charge");
      if (charge) charge.strength(-250).distanceMax(800);

      // Link distance: opportunity nodes orbit 160 units from their chain anchor
      const link = fg.d3Force("link");
      if (link) {
        link
          .distance((l: any) => (l.type === "active" ? 70 : 160))
          .strength((l: any) => (l.type === "active" ? 1 : 0.5));
      }

      // Remove center gravity so clouds can breathe freely
      fg.d3Force("center", null);

      // Kick the simulation so forces take effect
      fg.d3ReheatSimulation();
    };

    // Small delay to let the graph instance fully initialize
    const t = setTimeout(applyForces, 200);
    return () => clearTimeout(t);
  }, [graphData]);

  // Slow continuous camera orbit
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;

    const RADIUS = 900;
    const ELEVATION = 120;
    let angle = 0;

    const startDelay = setTimeout(() => {
      const rotate = () => {
        angle += 0.0006; // full rotation ~3 minutes
        graphRef.current?.cameraPosition({
          x: RADIUS * Math.sin(angle),
          y: ELEVATION,
          z: RADIUS * Math.cos(angle),
        });
        animRef.current = requestAnimationFrame(rotate);
      };
      animRef.current = requestAnimationFrame(rotate);
    }, 3000);

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
            isChain ? 32 : 8,
            isChain ? 32 : 8,
          );
          const color = isActive ? 0x16a34a : 0x111111;
          const mat = new THREE.MeshPhongMaterial({
            color,
            shininess: isChain ? 20 : 4,
          });
          const mesh = new THREE.Mesh(geo, mat);

          // Halo around chain anchors
          if (isChain) {
            mesh.add(
              new THREE.Mesh(
                new THREE.SphereGeometry(size * 3.5, 16, 16),
                new THREE.MeshBasicMaterial({
                  color: 0xcccccc,
                  transparent: true,
                  opacity: 0.06,
                }),
              ),
            );
          }

          // Glow for active positions
          if (isActive) {
            mesh.add(
              new THREE.Mesh(
                new THREE.SphereGeometry(size * 2.8, 12, 12),
                new THREE.MeshBasicMaterial({
                  color: 0x16a34a,
                  transparent: true,
                  opacity: 0.15,
                }),
              ),
            );
          }

          return mesh;
        }}
        nodeLabel={(node: any) =>
          `${node.name}${node.apy ? ` — ${node.apy.toFixed(1)}% APY` : ""}`
        }
        linkOpacity={0.08}
        linkWidth={0.15}
        linkColor={() => "#aaaaaa"}
        linkDirectionalParticles={0}
        onNodeClick={(node: any) => {
          if (!graphRef.current) return;
          const dist = 100;
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
        }}
        enableNodeDrag={false}
        // Never let the simulation cool down — cloud keeps breathing
        d3AlphaDecay={0.002}
        d3VelocityDecay={0.3}
        warmupTicks={0}
        cooldownTicks={Infinity}
      />

      {/* Legend — bottom-left, above the stats bar */}
      <div
        style={{
          position: "absolute",
          bottom: "60px",
          left: "56px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          fontSize: "10px",
          color: "#888",
          fontFamily: "monospace",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
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
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#111",
              display: "inline-block",
            }}
          />
          Opportunity
        </div>
      </div>
    </div>
  );
}
