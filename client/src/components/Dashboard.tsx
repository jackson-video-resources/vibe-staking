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

function abbrev(name: string) {
  return name.slice(0, 3).toUpperCase();
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

  const navBtn = (href: string, label: string) => {
    const active = loc === href;
    return (
      <Link href={href}>
        <a
          className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-mono font-bold transition-colors ${
            active
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black/20 hover:border-black/50"
          }`}
          title={label}
        >
          {label.slice(0, 1)}
        </a>
      </Link>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      {/* Graph — fills entire viewport */}
      <div className="absolute inset-0">
        <VibeGraph />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm border-b border-black/10 z-10">
        <span className="text-xs font-mono font-bold text-black tracking-widest">
          ◆ VIBE STAKING
        </span>
        <div className="flex items-center gap-2">
          {config?.isPaused && (
            <div className="flex items-center gap-1 mr-3">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="text-[10px] font-mono text-red-600 font-bold">
                PAUSED
              </span>
            </div>
          )}
          {navBtn("/", "Dashboard")}
          {navBtn("/audit", "Audit")}
          {navBtn("/settings", "Settings")}
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-sm border-t border-black/10 flex items-center z-10">
        {portfolio?.isOnboarded === false ? (
          <div className="w-full text-center text-xs text-black/50 font-mono">
            Send funds to get started
          </div>
        ) : (
          <div className="flex items-center divide-x divide-black/10 w-full">
            <StatCell
              label="Total Value"
              value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <StatCell label="APY" value={`${apy.toFixed(1)}%`} />
            <StatCell
              label="Yield Earned"
              value={`$${yieldEarned.toFixed(2)}`}
            />
            <StatCell label="Positions" value={String(positionCount)} />
            <StatCell label="Gas Today" value={`$${gasToday.toFixed(2)}`} />
          </div>
        )}
      </div>

      {/* Left protocol panel */}
      <div className="absolute left-0 top-10 bottom-12 w-12 flex flex-col items-center gap-1.5 py-3 overflow-y-auto z-10">
        {PROTOCOLS.map((proto) => {
          const isActive = activeProtocols.has(proto.toLowerCase());
          return (
            <div
              key={proto}
              title={proto}
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-[9px] font-mono font-bold transition-colors flex-shrink-0 ${
                isActive
                  ? "bg-black text-white border-black"
                  : "bg-white text-black/40 border-black/10"
              }`}
            >
              {abbrev(proto)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3">
      <span className="text-[9px] text-black/40 font-mono uppercase tracking-wider">
        {label}
      </span>
      <span className="text-xs font-bold text-black font-mono">{value}</span>
    </div>
  );
}
