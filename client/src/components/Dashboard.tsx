import VibeGraph from "./VibeGraph.js";
import { usePortfolio } from "../hooks/use-portfolio.js";
import { useConfig } from "../hooks/use-config.js";
import { Link, useLocation } from "wouter";

const PROTOCOLS = [
  "Aave",
  "Compound",
  "Lido",
  "Morpho",
  "Fluid",
  "Moonwell",
  "Euler",
  "Marinade",
  "Jito",
  "Bittensor",
];

const S = {
  root: {
    position: "relative" as const,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: "#fff",
  },
  graphLayer: {
    position: "absolute" as const,
    inset: 0,
  },
  topBar: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    zIndex: 20,
  },
  logo: {
    fontSize: "11px",
    fontFamily: "monospace",
    fontWeight: "bold",
    letterSpacing: "0.2em",
    color: "#000",
  },
  navRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  navBtn: (active: boolean) => ({
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: active ? "1px solid #000" : "1px solid rgba(0,0,0,0.2)",
    background: active ? "#000" : "#fff",
    color: active ? "#fff" : "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontFamily: "monospace",
    fontWeight: "bold",
    cursor: "pointer",
    textDecoration: "none",
  }),
  pausedBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginRight: "12px",
  },
  pausedDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#ef4444",
  },
  pausedText: {
    fontSize: "10px",
    fontFamily: "monospace",
    color: "#dc2626",
    fontWeight: "bold",
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: "52px",
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    zIndex: 20,
  },
  statCell: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid rgba(0,0,0,0.08)",
    padding: "0 8px",
  },
  statLabel: {
    fontSize: "9px",
    fontFamily: "monospace",
    color: "rgba(0,0,0,0.4)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  statValue: {
    fontSize: "12px",
    fontFamily: "monospace",
    fontWeight: "bold",
    color: "#000",
  },
  leftPanel: {
    position: "absolute" as const,
    left: 0,
    top: "44px",
    bottom: "52px",
    width: "48px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "6px",
    padding: "10px 0",
    overflowY: "auto" as const,
    zIndex: 20,
  },
  protoBtn: (active: boolean) => ({
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: active ? "1px solid #000" : "1px solid rgba(0,0,0,0.1)",
    background: active ? "#000" : "#fff",
    color: active ? "#fff" : "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "8px",
    fontFamily: "monospace",
    fontWeight: "bold",
    flexShrink: 0,
    cursor: "default",
    title: "",
  }),
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.statCell}>
      <span style={S.statLabel}>{label}</span>
      <span style={S.statValue}>{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data: portfolio } = usePortfolio();
  const { data: config } = useConfig();
  const [loc] = useLocation();

  const activeProtocols = new Set(
    portfolio?.positions?.map((p) => p.protocol.toLowerCase()) ?? [],
  );

  const totalValue = portfolio?.totalValueUsd ?? 0;
  const apy = portfolio?.netApyCurrent ?? 0;
  const yieldEarned = portfolio?.totalYieldEarnedUsd ?? 0;
  const positionCount = portfolio?.positionCount ?? 0;
  const gasToday = portfolio?.totalGasSpentUsd ?? 0;

  return (
    <div style={S.root}>
      {/* Graph — fills entire viewport */}
      <div style={S.graphLayer}>
        <VibeGraph />
      </div>

      {/* Top bar */}
      <div style={S.topBar}>
        <span style={S.logo}>◆ VIBE STAKING</span>
        <div style={S.navRow}>
          {config?.isPaused && (
            <div style={S.pausedBadge}>
              <span style={S.pausedDot} />
              <span style={S.pausedText}>PAUSED</span>
            </div>
          )}
          <Link href="/">
            <a style={S.navBtn(loc === "/")} title="Dashboard">
              D
            </a>
          </Link>
          <Link href="/audit">
            <a style={S.navBtn(loc === "/audit")} title="Audit">
              A
            </a>
          </Link>
          <Link href="/settings">
            <a style={S.navBtn(loc === "/settings")} title="Settings">
              S
            </a>
          </Link>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div style={S.bottomBar}>
        <StatCell
          label="Total Value"
          value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
        <StatCell label="APY" value={`${apy.toFixed(1)}%`} />
        <StatCell label="Yield Earned" value={`$${yieldEarned.toFixed(2)}`} />
        <StatCell label="Positions" value={String(positionCount)} />
        <StatCell label="Gas Today" value={`$${gasToday.toFixed(2)}`} />
      </div>

      {/* Left protocol panel */}
      <div style={S.leftPanel}>
        {PROTOCOLS.map((proto) => {
          const isActive = activeProtocols.has(proto.toLowerCase());
          return (
            <div key={proto} title={proto} style={S.protoBtn(isActive)}>
              {proto.slice(0, 3).toUpperCase()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
