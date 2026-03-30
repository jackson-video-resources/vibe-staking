import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";

interface Config {
  id: string;
  riskTolerance: number;
  maxSlippageBps: number;
  maxMovesPerDay: number;
  circuitBreakerPct: number;
  gasBudgetUsdPerDay: number;
  rebalanceThresholdPct: number;
  isPaused: boolean;
  pauseReason: string | null;
  evmAddress: string | null;
  solanaAddress: string | null;
  bittensorAddress: string | null;
  onboardedAt: string | null;
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<Config>("/config"),
    refetchInterval: 30_000,
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<Config>) =>
      api.put<Config>("/config", updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
  });
}
