import { useConfig, useUpdateConfig } from "../hooks/use-config.js";
import { useState } from "react";

export default function Settings() {
  const { data: config } = useConfig();
  const update = useUpdateConfig();
  const [saved, setSaved] = useState(false);

  async function handleSave(key: string, value: number) {
    await update.mutateAsync({ [key]: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!config)
    return <div className="p-6 text-slate-400 text-sm">Loading...</div>;

  const field = (
    label: string,
    key: string,
    value: number,
    min: number,
    max: number,
    step = 1,
    desc?: string,
  ) => (
    <div className="mb-6">
      <div className="flex justify-between mb-1">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="text-sm font-bold text-slate-100">{value}</span>
      </div>
      {desc && <p className="text-xs text-slate-500 mb-2">{desc}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        onMouseUp={(e) =>
          handleSave(key, Number((e.target as HTMLInputElement).value))
        }
        className="w-full accent-indigo-500"
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-slate-100">Settings</h1>
        {saved && <span className="text-xs text-green-400">Saved</span>}
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">
          Risk Profile
        </h2>
        {field(
          "Risk Tolerance",
          "riskTolerance",
          config.riskTolerance,
          1,
          10,
          1,
          "1 = conservative (stablecoins, audited protocols). 10 = aggressive (high-APY, all protocols).",
        )}
        {field(
          "Rebalance Threshold (%)",
          "rebalanceThresholdPct",
          config.rebalanceThresholdPct,
          0.5,
          10,
          0.5,
          "Only rebalance if the new opportunity beats current APY by this much.",
        )}
        {field(
          "Circuit Breaker (%)",
          "circuitBreakerPct",
          config.circuitBreakerPct,
          1,
          50,
          1,
          "Pause all activity if portfolio drops this % from its peak in 24h.",
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">
          Execution Limits
        </h2>
        {field(
          "Max Moves Per Day",
          "maxMovesPerDay",
          config.maxMovesPerDay,
          1,
          20,
          1,
          "Maximum rebalancing moves the agent can execute in a 24h period.",
        )}
        {field(
          "Gas Budget (USD/day)",
          "gasBudgetUsdPerDay",
          config.gasBudgetUsdPerDay,
          1,
          100,
          1,
          "Stop executing if cumulative gas costs exceed this daily budget.",
        )}
        {field(
          "Max Slippage (bps)",
          "maxSlippageBps",
          config.maxSlippageBps,
          10,
          500,
          10,
          "Maximum allowed slippage on any swap. 100 bps = 1%.",
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Wallets</h2>
        <div className="space-y-3 text-xs">
          <div>
            <div className="text-slate-400 mb-1">
              EVM (Ethereum / Arbitrum / Base)
            </div>
            <code className="text-slate-300 break-all">
              {config.evmAddress ?? "Not configured"}
            </code>
          </div>
          <div>
            <div className="text-slate-400 mb-1">Solana</div>
            <code className="text-slate-300 break-all">
              {config.solanaAddress ?? "Not configured"}
            </code>
          </div>
          <div>
            <div className="text-slate-400 mb-1">Bittensor</div>
            <code className="text-slate-300 break-all">
              {config.bittensorAddress ?? "Not configured"}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
