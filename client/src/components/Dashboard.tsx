import VibeGraph from "./VibeGraph.js";
import PortfolioStats from "./PortfolioStats.js";
import PositionCard from "./PositionCard.js";
import { usePortfolio } from "../hooks/use-portfolio.js";
import { useConfig } from "../hooks/use-config.js";
import { Pause, Play, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data: portfolio } = usePortfolio();
  const { data: config } = useConfig();

  return (
    <div className="flex h-full">
      {/* 3D Graph — takes most of the space */}
      <div className="flex-1 relative">
        <VibeGraph />
      </div>

      {/* Right sidebar */}
      <div className="w-80 flex-shrink-0 border-l border-slate-700 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Status banner */}
        {config?.isPaused && (
          <div className="flex items-center gap-2 bg-red-950 border border-red-700 rounded-lg p-3 text-sm text-red-300">
            <Pause size={14} />
            <div>
              <div className="font-medium">System Paused</div>
              <div className="text-xs text-red-400 mt-0.5">
                {config.pauseReason}
              </div>
            </div>
          </div>
        )}

        {portfolio && !portfolio.isOnboarded && (
          <div className="flex items-center gap-2 bg-amber-950 border border-amber-700 rounded-lg p-3 text-sm text-amber-300">
            <AlertCircle size={14} />
            <div>
              <div className="font-medium">Not onboarded</div>
              <div className="text-xs text-amber-400 mt-0.5">
                Run the SETUP.md prompt to generate wallets
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <PortfolioStats />

        {/* Active positions */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Positions
          </h2>
          {portfolio?.positions?.length === 0 && (
            <div className="text-xs text-slate-500 bg-slate-800 rounded-lg p-4 text-center">
              No positions yet.
              <br />
              Send funds to your wallet to get started.
            </div>
          )}
          <div className="flex flex-col gap-2">
            {portfolio?.positions?.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </div>

        {/* Wallet addresses (compact) */}
        {config && (
          <div className="text-[10px] text-slate-600 space-y-1">
            <div className="font-medium text-slate-500 mb-1">
              Deposit addresses:
            </div>
            {config.evmAddress && (
              <div className="truncate">
                <span className="text-slate-500">EVM:</span> {config.evmAddress}
              </div>
            )}
            {config.solanaAddress && (
              <div className="truncate">
                <span className="text-slate-500">SOL:</span>{" "}
                {config.solanaAddress}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
