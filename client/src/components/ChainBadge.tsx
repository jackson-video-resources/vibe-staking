const CHAIN_COLORS: Record<string, string> = {
  Ethereum: "bg-blue-900 text-blue-300",
  Arbitrum: "bg-sky-900 text-sky-300",
  Base: "bg-indigo-900 text-indigo-300",
  Optimism: "bg-red-900 text-red-300",
  Polygon: "bg-purple-900 text-purple-300",
  Solana: "bg-green-900 text-green-300",
  Bittensor: "bg-gray-800 text-gray-300",
  BSC: "bg-yellow-900 text-yellow-300",
  Avalanche: "bg-orange-900 text-orange-300",
};

export default function ChainBadge({ chain }: { chain: string }) {
  const classes = CHAIN_COLORS[chain] ?? "bg-slate-700 text-slate-300";
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${classes}`}
    >
      {chain}
    </span>
  );
}
