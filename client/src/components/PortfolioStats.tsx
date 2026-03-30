import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Fuel, AlertTriangle } from "lucide-react";
import { usePortfolio } from "../hooks/use-portfolio.js";

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-slate-100",
  sub,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color?: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-xl p-4 border border-slate-700"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{label}</span>
        <Icon size={14} className="text-slate-500" />
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </motion.div>
  );
}

export default function PortfolioStats() {
  const { data: portfolio } = usePortfolio();

  if (!portfolio) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Portfolio Value"
        value={`$${portfolio.totalValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign}
        color="text-slate-100"
        sub={`${portfolio.positionCount} active position${portfolio.positionCount !== 1 ? "s" : ""}`}
      />
      <StatCard
        label="Current APY"
        value={`${portfolio.netApyCurrent.toFixed(1)}%`}
        icon={TrendingUp}
        color="text-green-400"
        sub="weighted average"
      />
      <StatCard
        label="Yield Earned"
        value={`$${portfolio.totalYieldEarnedUsd.toFixed(2)}`}
        icon={DollarSign}
        color="text-green-400"
        sub="total lifetime"
      />
      <StatCard
        label="Drawdown"
        value={`${portfolio.drawdownPct.toFixed(1)}%`}
        icon={AlertTriangle}
        color={portfolio.drawdownPct > 5 ? "text-red-400" : "text-slate-300"}
        sub="from peak"
      />
    </div>
  );
}
