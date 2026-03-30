import { db } from "../db.js";
import { config } from "../../shared/schema.js";
import { env } from "../env.js";

export async function checkOnboarding() {
  const [cfg] = await db.select().from(config).limit(1);

  if (!cfg || !cfg.onboardedAt) {
    console.log(
      "[onboarding] No config found — run the SETUP.md prompt to onboard.",
    );
    console.log(
      "[onboarding] Set RISK_TOLERANCE in env vars before deploying.",
    );
    await bootstrapConfig();
    return;
  }

  console.log(
    `[onboarding] Ready. EVM: ${cfg.evmAddress ?? "not set"}, Solana: ${cfg.solanaAddress ?? "not set"}`,
  );
}

async function bootstrapConfig() {
  // Create a placeholder config row — wallets generated during interactive onboarding
  const [existing] = await db.select().from(config).limit(1);
  if (existing) return;

  await db.insert(config).values({
    riskTolerance: env.RISK_TOLERANCE,
    updatedAt: new Date(),
  });

  console.log(
    "[onboarding] Placeholder config created. Run the SETUP.md one-shot prompt to generate wallets.",
  );
}

export async function generateAndStoreWallets() {
  const [{ generateMnemonic, english, mnemonicToAccount }] = await Promise.all([
    import("viem/accounts"),
  ]);
  const { Keypair } = await import("@solana/web3.js");
  const bs58 = (await import("bs58")).default;
  const { Keyring } = await import("@polkadot/keyring");
  const { mnemonicGenerate } = await import("@polkadot/util-crypto");
  const { encrypt } = await import("./encrypt.js");

  // EVM wallet (covers all EVM chains with the same address)
  const evmMnemonic = generateMnemonic(english);
  const evmAccount = mnemonicToAccount(evmMnemonic);
  const evmPrivateKey = evmAccount.getHdKey().privateKey;
  if (!evmPrivateKey) throw new Error("Failed to derive EVM private key");
  const evmPrivKeyHex = Buffer.from(evmPrivateKey).toString("hex");

  // Solana wallet
  const solanaKeypair = Keypair.generate();
  const solanaAddress = solanaKeypair.publicKey.toBase58();
  const solanaPrivKey = bs58.encode(solanaKeypair.secretKey);

  // Bittensor wallet (sr25519)
  const btMnemonic = mnemonicGenerate();
  const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
  const btPair = keyring.addFromMnemonic(btMnemonic);
  const btAddress = btPair.address;
  // Encrypt all private keys — store Bittensor mnemonic only (KeyringPair doesn't expose raw secretKey)
  const encryptedEvmKey = encrypt(`${evmMnemonic}:${evmPrivKeyHex}`);
  const encryptedSolanaKey = encrypt(solanaPrivKey);
  const encryptedBittensorKey = encrypt(btMnemonic);

  // Store in DB
  const [existing] = await db.select().from(config).limit(1);
  if (existing) {
    await db.update(config).set({
      evmAddress: evmAccount.address,
      solanaAddress,
      bittensorAddress: btAddress,
      encryptedEvmKey,
      encryptedSolanaKey,
      encryptedBittensorKey,
      onboardedAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db.insert(config).values({
      riskTolerance: env.RISK_TOLERANCE,
      evmAddress: evmAccount.address,
      solanaAddress,
      bittensorAddress: btAddress,
      encryptedEvmKey,
      encryptedSolanaKey,
      encryptedBittensorKey,
      onboardedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return {
    evm: { address: evmAccount.address, mnemonic: evmMnemonic },
    solana: { address: solanaAddress },
    bittensor: { address: btAddress, mnemonic: btMnemonic },
  };
}
