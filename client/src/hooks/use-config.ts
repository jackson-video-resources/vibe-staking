import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const DEMO_CONFIG = {
  id: "demo",
  riskTolerance: 6,
  maxSlippageBps: 100,
  maxMovesPerDay: 5,
  circuitBreakerPct: 10,
  gasBudgetUsdPerDay: 20,
  rebalanceThresholdPct: 2,
  isPaused: false,
  pauseReason: null,
  evmAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  solanaAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  bittensorAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  onboardedAt: new Date().toISOString(),
};

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
    queryFn: async () => {
      if (DEMO_MODE) return DEMO_CONFIG as Config;
      return api.get<Config>("/config");
    },
    refetchInterval: DEMO_MODE ? false : 30_000,
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
