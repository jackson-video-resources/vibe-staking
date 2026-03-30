# Vibe Staking

AI-powered DeFi yield optimizer. Runs autonomously 24/7 — scans DeFiLlama every 15 minutes, uses Claude to decide when to rebalance, and executes moves automatically across Ethereum, Arbitrum, Base, Solana, and Bittensor.

**Full tutorial**: [YouTube — Vibe Staking: Build an AI Yield Optimizer](https://youtube.com/@jacksonvideos)

---

## How it works

```
DeFiLlama (free) → YieldScout → RiskModel → Claude AI → Executor → Your wallet
     every 15 min       filter      score      decide       execute    gets yield
```

1. **YieldScout** polls 3,000+ DeFi pools from DeFiLlama (no API key needed)
2. **RiskModel** scores each pool by chain risk, IL risk, TVL, and your risk tolerance
3. **Claude** (claude-sonnet-4-6) decides whether the best opportunity beats your current APY by the threshold you set
4. **Executor** withdraws from current position, bridges via LI.FI, deposits into new protocol
5. **Telegram** notifies you of every move

Claude is called only when a move is actually worth it — typically 2–6 times/day.

---

## One-shot setup

Paste the prompt from **SETUP.md** into Claude Code. It will:

1. Ask 4 questions (capital, risk tolerance, Telegram, Railway account)
2. Install dependencies and set up your environment
3. Generate fresh EVM + Solana + Bittensor wallets
4. Push schema to your Railway PostgreSQL database
5. Start the server and show you the dashboard
6. Deploy to Railway

That's it. Send funds to the generated addresses and the agent starts working.

---

## Manual setup

```bash
git clone https://github.com/jackson-video-resources/vibe-staking
cd vibe-staking
npm install

# Copy and fill in environment variables
cp .env.example .env

# Push DB schema
npm run db:push

# Start (server on :3000, dashboard on :5173)
npm run dev
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Railway auto-sets this) |
| `ENCRYPTION_KEY` | Yes | 64-char hex: `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Yes | For Claude portfolio decisions |
| `ADMIN_KEY` | Yes | Protects config writes: `openssl rand -hex 16` |
| `VITE_ADMIN_KEY` | Yes | Same value as ADMIN_KEY — baked into frontend build |
| `TELEGRAM_BOT_TOKEN` | No | Get from @BotFather |
| `TELEGRAM_CHAT_ID` | No | Get from @userinfobot |
| `RISK_TOLERANCE` | No | 1–10 (default 5) |

---

## Dashboard

The 3D dashboard shows capital flow as an animated graph — chain nodes orbit each other, active positions glow green, and particle streams show funds moving between protocols.

Access at `http://localhost:5173` in dev, or your Railway URL in production.

---

## Supported protocols

| Protocol | Chain | What |
|----------|-------|------|
| Aave V3 | Ethereum, Arbitrum, Base | USDC/ETH lending |
| Compound V3 | Ethereum, Arbitrum | USDC lending |
| Lido | Ethereum | ETH → stETH staking |
| Marinade Finance | Solana | SOL → mSOL liquid staking |
| Jito | Solana | SOL → jitoSOL MEV-boosted staking |
| Bittensor Staking | Bittensor | TAO delegation |

Adding more: create `server/agents/adapters/{protocol}.ts`, add to `EXECUTABLE_PROTOCOLS` in `shared/constants.ts`, register in `server/agents/adapters/index.ts`.

---

## Security

- Private keys encrypted with AES-256-GCM at rest. `ENCRYPTION_KEY` lives only in Railway env vars.
- Keys decrypted only at signing time — never cached in memory.
- Token approvals are exact amounts only, revoked to zero after each transaction.
- Max 1% slippage on all swaps (configurable).
- Circuit breaker: pauses if portfolio drops more than X% from peak in 24h.
- Rate limiter: max N moves/day + daily gas budget in USD.
- Claude responses are schema-validated before execution — protocol must be in whitelist, chain must be supported, amount must be finite and positive.
- Telegram bot only responds to the configured chat ID.
- Config writes require `ADMIN_KEY` header.

---

## Deploy to Railway

```bash
railway up -d
```

Railway detects the `Dockerfile` and builds automatically. Set all env vars in the Railway dashboard.

---

## Stack

- **Backend**: Node.js + TypeScript + Express 5, ESM
- **Frontend**: React 19 + Vite + Tailwind CSS + `react-force-graph-3d`
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Anthropic SDK (claude-sonnet-4-6)
- **Chains**: viem (EVM), @solana/web3.js, @polkadot/api (Bittensor)
- **Routing**: LI.FI SDK (free cross-chain DEX + bridge aggregator)
- **Notifications**: Telegraf

---

## License

MIT — use it, fork it, build on it.
