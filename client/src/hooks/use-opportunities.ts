import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { DEMO_OPPORTUNITIES } from "../lib/demo-data.js";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

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
    queryFn: async () => {
      if (DEMO_MODE) return DEMO_OPPORTUNITIES as Opportunity[];
      return api.get<Opportunity[]>("/opportunities");
    },
    refetchInterval: DEMO_MODE ? false : 60_000,
  });
}
