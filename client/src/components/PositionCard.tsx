import { TrendingUp, Clock } from "lucide-react";
import ChainBadge from "./ChainBadge.js";

interface Position {
  id: string;
  chain: string;
  protocol: string;
  symbol: string;
  amountUsd: number;
  entryApy: number;
  currentApy: number | null;
  enteredAt: string;
  status: string;
}

function timeSince(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PositionCard({ position }: { position: Position }) {
  const apy = position.currentApy ?? position.entryApy;

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-start">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ChainBadge chain={position.chain} />
          <span className="text-sm font-medium text-slate-100">
            {position.protocol}
          </span>
        </div>
        <div className="text-xs text-slate-400">{position.symbol}</div>
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
          <Clock size={10} />
          {timeSince(position.enteredAt)} ago
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-slate-100">
          $
          {position.amountUsd.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })}
        </div>
        <div className="flex items-center justify-end gap-1 text-green-400 text-xs font-medium">
          <TrendingUp size={10} />
          {apy.toFixed(1)}% APY
        </div>
        {position.status === "exiting" && (
          <div className="text-xs text-red-400 mt-1">exiting...</div>
        )}
      </div>
    </div>
  );
}
