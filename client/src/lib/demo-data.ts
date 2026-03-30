// Dense demo data — simulates a live portfolio scanning hundreds of opportunities

const CHAINS = [
  "Ethereum",
  "Arbitrum",
  "Base",
  "Solana",
  "Bittensor",
  "Optimism",
  "Polygon",
  "Avalanche",
  "BSC",
];

const PROTOCOLS = [
  "aave-v3",
  "compound-v3",
  "lido",
  "rocket-pool",
  "frax-ether",
  "curve-finance",
  "convex-finance",
  "yearn-finance",
  "balancer",
  "uniswap-v3",
  "sushi",
  "pancakeswap",
  "trader-joe",
  "gmx",
  "gains-network",
  "synthetix",
  "dydx",
  "kwenta",
  "marinade-finance",
  "jito",
  "solend",
  "marginfi",
  "drift",
  "radiant-capital",
  "benqi",
  "vector-finance",
  "platypus",
  "pendle-finance",
  "angle-protocol",
  "morpho",
  "spark",
  "bittensor-staking",
  "taostats",
  "opentensor",
  "stargate",
  "layerzero",
  "across-protocol",
  "hop-protocol",
  "exactly-protocol",
  "silo-finance",
  "euler",
  "notional",
  "tokemak",
  "ribbon-finance",
  "jones-dao",
  "dopex",
  "olympus",
  "frax",
  "fei",
  "alchemix",
  "inverse-finance",
  "clearpool",
  "maple-finance",
  "goldfinch",
  "truefi",
];

const SYMBOLS = [
  "USDC",
  "USDT",
  "ETH",
  "WBTC",
  "SOL",
  "TAO",
  "DAI",
  "FRAX",
  "stETH",
  "rETH",
  "MATIC",
  "AVAX",
  "BNB",
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate 300 opportunity nodes spread across all chains and protocols
function generateOpportunities() {
  const opps = [];
  for (let i = 0; i < 300; i++) {
    const chain = pick(CHAINS);
    const protocol = pick(PROTOCOLS);
    const apy = rand(0.5, 45);
    const tvl = rand(500_000, 2_000_000_000);
    const vibeScore = rand(20, 95);
    opps.push({
      id: `o${i}`,
      llamaPoolId: `pool-${i}`,
      chain,
      protocol,
      symbol: pick(SYMBOLS),
      tvlUsd: tvl,
      apy,
      apyMean30d: apy * rand(0.8, 1.1),
      stablecoin: Math.random() > 0.6,
      ilRisk: pick(["none", "low", "medium"]),
      riskScore: Math.floor(rand(5, 40)),
      vibeScore,
      executable:
        vibeScore > 55 &&
        [
          "aave-v3",
          "compound-v3",
          "lido",
          "marinade-finance",
          "jito",
          "bittensor-staking",
        ].includes(protocol),
      scannedAt: new Date().toISOString(),
    });
  }
  return opps;
}

export const DEMO_OPPORTUNITIES = generateOpportunities();

export const DEMO_PORTFOLIO = {
  totalValueUsd: 48_320.0,
  netApyCurrent: 11.2,
  totalYieldEarnedUsd: 1_847.5,
  totalGasSpentUsd: 43.8,
  drawdownPct: 1.2,
  positionCount: 6,
  lastSnapshotAt: new Date().toISOString(),
  isOnboarded: true,
  wallets: {
    evm: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    solana: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    bittensor: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  },
  positions: [
    {
      id: "1",
      chain: "Arbitrum",
      protocol: "aave-v3",
      pool: "USDC",
      symbol: "USDC",
      amountUsd: 12000,
      entryApy: 7.2,
      currentApy: 8.1,
      status: "active",
      enteredAt: new Date().toISOString(),
    },
    {
      id: "2",
      chain: "Ethereum",
      protocol: "lido",
      pool: "stETH",
      symbol: "stETH",
      amountUsd: 15000,
      entryApy: 3.8,
      currentApy: 4.2,
      status: "active",
      enteredAt: new Date().toISOString(),
    },
    {
      id: "3",
      chain: "Solana",
      protocol: "marinade-finance",
      pool: "mSOL",
      symbol: "SOL",
      amountUsd: 8500,
      entryApy: 6.9,
      currentApy: 7.4,
      status: "active",
      enteredAt: new Date().toISOString(),
    },
    {
      id: "4",
      chain: "Base",
      protocol: "compound-v3",
      pool: "USDC",
      symbol: "USDC",
      amountUsd: 5200,
      entryApy: 8.8,
      currentApy: 9.1,
      status: "active",
      enteredAt: new Date().toISOString(),
    },
    {
      id: "5",
      chain: "Solana",
      protocol: "jito",
      pool: "jitoSOL",
      symbol: "SOL",
      amountUsd: 4800,
      entryApy: 8.2,
      currentApy: 8.9,
      status: "active",
      enteredAt: new Date().toISOString(),
    },
    {
      id: "6",
      chain: "Bittensor",
      protocol: "bittensor-staking",
      pool: "TAO",
      symbol: "TAO",
      amountUsd: 2820,
      entryApy: 18.5,
      currentApy: 19.2,
      status: "active",
      enteredAt: new Date().toISOString(),
    },
  ],
};
