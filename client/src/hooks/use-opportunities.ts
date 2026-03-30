import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

interface Opportunity {
  id: string;
  llamaPoolId: string;
  chain: string;
  protocol: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyMean30d: number | null;
  stablecoin: boolean;
  ilRisk: string | null;
  riskScore: number | null;
  vibeScore: number | null;
  executable: boolean;
  scannedAt: string;
}

export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api.get<Opportunity[]>("/opportunities"),
    refetchInterval: 60_000,
  });
}
