import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

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
    queryFn: () => api.get<Portfolio>("/portfolio"),
    refetchInterval: 10_000,
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
  });
}
