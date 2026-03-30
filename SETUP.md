# Vibe Staking — One-Shot Setup

Copy the prompt below and paste it into **Claude Code** (claude.ai/code or the CLI).

Claude will ask you a few questions, generate your wallets, and get your yield optimizer running.

---

## The One-Shot Prompt

```
You are going to set up Vibe Staking — an AI-powered DeFi yield optimizer — on my computer.

Work in ~/vibe-staking/ (clone from https://github.com/jackson-video-resources/vibe-staking if the directory doesn't exist).

First, have a short conversation with me to understand my setup. Ask me these questions one at a time (wait for my answer before asking the next):

1. "How much capital are you planning to put in? (This helps me set the right strategy — $100, $1K, $10K, $100K+)"
2. "What's your risk tolerance on a scale of 1-10? (1 = conservative — stablecoins and battle-tested protocols only. 10 = aggressive — chase the highest APY wherever it is.)"
3. "Do you already have a Telegram bot set up? If yes, share your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID. If not, I'll guide you to create one — it takes 2 minutes."
4. "Do you have a Railway account? (railway.app — free tier works fine). If yes, are you already logged in via the CLI?"

Based on the answers:
- If capital < $500: set RISK_TOLERANCE to max(answer, 3), note they should stick to L2s/Solana to avoid ETH gas eating returns
- If capital >= $50K: note we'll enforce the TVL floor and 30% per-protocol max
- Adjust the rebalance threshold suggestion based on capital (smaller capital = higher threshold needed to justify gas)

Then:
1. Run `npm install` in ~/vibe-staking/
2. Generate secret keys:
   - ENCRYPTION_KEY: run `openssl rand -hex 32`
   - ADMIN_KEY: run `openssl rand -hex 16` (protects dashboard settings)
   Set VITE_ADMIN_KEY to the same value as ADMIN_KEY — it's baked into the frontend build.
3. Create a .env file with all the values we discussed
4. Run `npm run db:push` to set up the database (they may need to create a Railway PostgreSQL first — guide them if needed)
5. Start the server locally with `npm run dev` and confirm it's running at localhost:3000
6. Call the wallet generation endpoint or run the onboarding script to generate EVM + Solana + Bittensor wallets
7. Display the wallet addresses clearly with instructions: "Send your crypto to these addresses to get started. The agent will detect the deposit and begin optimizing automatically."
8. Show the dashboard URL: http://localhost:5173
9. For Railway deployment: run `railway up -d` and confirm the deployment URL

Throughout: be conversational, explain what each step does in plain English. This is meant for someone who may be new to DeFi automation but is technically capable.

At the end, confirm:
- Dashboard is accessible
- Telegram bot is connected (send a test message)
- Agent will start scanning on the next 15-minute cron cycle
- Print a summary of their configuration
```

---

## What gets set up

- **Wallets generated**: One EVM address (works on Ethereum, Arbitrum, Base, and all EVM chains), one Solana address, one Bittensor address
- **Agent running**: Scans DeFiLlama every 15 minutes for the best yield (free, no API key)
- **Autonomous execution**: Claude decides when to rebalance, LI.FI handles the cross-chain routing
- **Dashboard**: 3D visualization of where your capital is and where it's being evaluated
- **Telegram updates**: Daily summary + instant alerts on every move

## Security notes

- Your private keys are encrypted with AES-256-GCM before being stored in the database
- The encryption key only exists in your environment variables — never in the code or database
- The system can only pause itself (via circuit breaker) — it cannot send funds to new addresses
- All token approvals are for exact amounts only, revoked after each transaction
- Maximum 1% slippage on all swaps
