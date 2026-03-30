import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { DEMO_PORTFOLIO } from "../lib/demo-data.js";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

interface Position {
  id: string;
  chain: string;
  protocol: string;
  pool: string;
  symbol: string;
  amountUsd: number;
  entryApy: number;
  currentApy: number | null;
  status: string;
  enteredAt: string;
}

interface Portfolio {
  totalValueUsd: number;
  netApyCurrent: number;
  totalYieldEarnedUsd: number;
  totalGasSpentUsd: number;
  drawdownPct: number;
  positionCount: number;
  positions: Position[];
  lastSnapshotAt: string | null;
  isOnboarded: boolean;
  wallets: {
    evm: string | null;
    solana: string | null;
    bittensor: string | null;
  };
}

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      if (DEMO_MODE) return DEMO_PORTFOLIO as Portfolio;
      return api.get<Portfolio>("/portfolio");
    },
    refetchInterval: DEMO_MODE ? false : 10_000,
  });
}

export function useHistory() {
  return useQuery({
    queryKey: ["history"],
    queryFn: () =>
      api.get<
        { totalValueUsd: number; timestamp: string; netApyCurrent: number }[]
      >("/history"),
    refetchInterval: 60_000,
    enabled: !DEMO_MODE,
  });
}
