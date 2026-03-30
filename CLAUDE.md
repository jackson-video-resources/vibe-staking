# Vibe Staking

## What it is
AI-powered yield optimizer that runs autonomously 24/7. Three cron agents (YieldScout → RiskModel → PortfolioManager) continuously find and move capital to the best yield opportunities across DeFi protocols and chains.

## Stack
- **Backend**: Node.js + TypeScript + Express 5, ESM
- **Frontend**: React 19 + Vite + Tailwind CSS, `react-force-graph-3d` for 3D visualization
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: `@anthropic-ai/sdk` (claude-sonnet-4-6) for portfolio decisions
- **Chains**: EVM (Ethereum/Arbitrum/Base/etc via viem + LI.FI), Solana (@solana/web3.js), Bittensor (@polkadot/api)
- **Deploy**: Railway (Dockerfile)

## Key directories
- `server/agents/` — the three AI agents + protocol adapters
- `server/wallet/` — wallet generation, encryption (AES-256-GCM), multi-chain clients
- `server/safety/` — circuit breaker, slippage guard, approval guard, rate limiter
- `server/telegram/` — notification-only bot + commands
- `client/src/components/VibeGraph.tsx` — 3D force-directed graph visualization
- `shared/schema.ts` — all 6 DB tables

## Commands
```bash
npm run dev       # start both server (port 3000) and vite client (port 5173)
npm run build     # vite build + esbuild server bundle
npm run db:push   # push schema to DB
npm run typecheck # TypeScript check
```

## Deploy
```bash
railway up -d
```

## Environment variables required
See `.env.example`. Key vars:
- `DATABASE_URL` — Railway PostgreSQL (auto-set)
- `ENCRYPTION_KEY` — 64-char hex: `openssl rand -hex 32`
- `ANTHROPIC_API_KEY` — for portfolio decision agent
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — optional but recommended
- `RISK_TOLERANCE` — 1-10 (default 5)

## Security
- Private keys never stored in plaintext — AES-256-GCM encrypted in DB
- Keys decrypted only at signing time, never cached in memory
- Exact-amount token approvals only — revoked after each tx
- Max 1% slippage on all swaps (configurable)
- Circuit breaker: pauses if portfolio drops >10% from peak
- Rate limiter: max 5 moves/day (configurable)
- Claude responses are JSON-schema validated before execution

## Agent flow (every 15 min)
1. YieldScout fetches DeFiLlama (free) → filters → vibeScore
2. RiskModel scores by chain risk, IL risk, TVL, protocol age, capital tier
3. If best candidate > current APY + threshold → PortfolioManager calls Claude
4. Claude returns Move[] as structured JSON
5. Executor validates safety checks → executes via LI.FI + protocol adapters
6. Telegram notification sent

## Adding a new protocol adapter
1. Create `server/agents/adapters/{protocol}.ts` implementing `ProtocolAdapter`
2. Add to `EXECUTABLE_PROTOCOLS` in `shared/constants.ts`
3. Register in `server/agents/adapters/index.ts`
