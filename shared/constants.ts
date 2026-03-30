export const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

export const SUPPORTED_CHAINS = [
  "Ethereum",
  "Arbitrum",
  "Base",
  "Optimism",
  "Polygon",
  "BSC",
  "Avalanche",
  "Solana",
  "Bittensor",
] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const CHAIN_IDS: Record<string, number> = {
  Ethereum: 1,
  Arbitrum: 42161,
  Base: 8453,
  Optimism: 10,
  Polygon: 137,
  BSC: 56,
  Avalanche: 43114,
};

export const PUBLIC_RPC_URLS: Record<string, string> = {
  Ethereum: "https://eth.llamarpc.com",
  Arbitrum: "https://arb1.arbitrum.io/rpc",
  Base: "https://mainnet.base.org",
  Optimism: "https://mainnet.optimism.io",
  Polygon: "https://polygon-rpc.com",
  BSC: "https://bsc-dataseed.binance.org",
  Avalanche: "https://api.avax.network/ext/bc/C/rpc",
};

export const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
export const BITTENSOR_WS_URL = "wss://entrypoint-finney.opentensor.ai:443";

// Minimum TVL to consider an opportunity (USD)
export const MIN_TVL_USD = 1_000_000;
// For large capital (>$50K), require higher TVL floor
export const MIN_TVL_USD_LARGE = 10_000_000;
// Reject APYs that look like errors or scams
export const MAX_APY_SANITY = 1000;
// Minimum 30-day mean APY history required
export const MIN_APY_MEAN_30D = 1;

// Capital tiers (USD)
export const CAPITAL_TIERS = {
  micro: { min: 0, max: 500 },
  small: { min: 500, max: 5_000 },
  medium: { min: 5_000, max: 50_000 },
  large: { min: 50_000, max: Infinity },
};

// Protocol slugs we have execution adapters for
export const EXECUTABLE_PROTOCOLS = new Set([
  "aave-v3",
  "lido",
  "compound-v3",
  "marinade-finance",
  "jito",
  "bittensor-staking",
  "moonwell",
  "fluid",
]);

// EVM token addresses for common tokens per chain
export const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  Ethereum: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  },
  Arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  },
  Base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
  },
};

// Aave V3 pool addresses per chain
export const AAVE_V3_POOL: Record<string, string> = {
  Ethereum: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
  Arbitrum: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  Base: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
};

// Lido stETH contract
export const LIDO_STETH = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
// Lido submit function sig
export const LIDO_SUBMIT_SIG = "0xa1903eab"; // submit(address referral)

// Dashboard graph colors
export const GRAPH_COLORS = {
  active: "#22c55e",
  evaluating: "#eab308",
  exiting: "#ef4444",
  idle: "#475569",
  chain: "#6366f1",
};
