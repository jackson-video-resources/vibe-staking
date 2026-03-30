import type {
  ProtocolAdapter,
  DepositParams,
  WithdrawParams,
} from "./index.js";
import type { ExecutionResult } from "../../../shared/types.js";

// Bittensor TAO delegation — stake TAO to a validator on a subnet
// Uses @polkadot/api to construct substrate extrinsics

const BITTENSOR_WS = "wss://entrypoint-finney.opentensor.ai:443";
// Default to highest-emission validator (would be dynamic in production)
const DEFAULT_VALIDATOR_HOTKEY =
  "5F4tQyWrhfGVcNhoqeiNsR6KjD4wMZ2kfhLj4ofoVEBE9zUH";
const TAO_PRICE_USD = 500;

export const taoDelegate: ProtocolAdapter = {
  protocol: "bittensor-staking",

  async deposit({ db, amountUsd }: DepositParams): Promise<ExecutionResult> {
    try {
      const { ApiPromise, WsProvider } = await import("@polkadot/api");
      const { Keyring } = await import("@polkadot/keyring");
      const { decrypt } = await import("../../wallet/encrypt.js");
      const { config } = await import("../../../shared/schema.js");

      const [cfg] = await db.select().from(config).limit(1);
      if (!cfg?.encryptedBittensorKey)
        return {
          success: false,
          errorMessage: "Bittensor wallet not configured",
        };

      const decrypted = decrypt(cfg.encryptedBittensorKey);
      const [mnemonic] = decrypted.split(":");

      const provider = new WsProvider(BITTENSOR_WS);
      const api = await ApiPromise.create({ provider });

      const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
      const account = keyring.addFromMnemonic(mnemonic);

      // Convert USD → RAO (1 TAO = 1e9 RAO)
      const amountRao = BigInt(Math.floor((amountUsd / TAO_PRICE_USD) * 1e9));

      const tx = api.tx.subtensorModule.addStake(
        DEFAULT_VALIDATOR_HOTKEY,
        amountRao,
      );

      const txHash = await new Promise<string>((resolve, reject) => {
        tx.signAndSend(account, ({ status }) => {
          if (status.isFinalized) resolve(status.asFinalized.toString());
          if (status.isDropped || status.isInvalid)
            reject(new Error("Transaction dropped/invalid"));
        }).catch(reject);
      });

      await provider.disconnect();

      return { success: true, txHash, gasCostUsd: 0.01 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },

  async withdraw({ db, amountUsd }: WithdrawParams): Promise<ExecutionResult> {
    try {
      const { ApiPromise, WsProvider } = await import("@polkadot/api");
      const { Keyring } = await import("@polkadot/keyring");
      const { decrypt } = await import("../../wallet/encrypt.js");
      const { config } = await import("../../../shared/schema.js");

      const [cfg] = await db.select().from(config).limit(1);
      if (!cfg?.encryptedBittensorKey)
        return {
          success: false,
          errorMessage: "Bittensor wallet not configured",
        };

      const decrypted = decrypt(cfg.encryptedBittensorKey);
      const [mnemonic] = decrypted.split(":");

      const provider = new WsProvider(BITTENSOR_WS);
      const api = await ApiPromise.create({ provider });

      const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
      const account = keyring.addFromMnemonic(mnemonic);

      const amountRao = BigInt(Math.floor((amountUsd / TAO_PRICE_USD) * 1e9));

      const tx = api.tx.subtensorModule.removeStake(
        DEFAULT_VALIDATOR_HOTKEY,
        amountRao,
      );

      const txHash = await new Promise<string>((resolve, reject) => {
        tx.signAndSend(account, ({ status }) => {
          if (status.isFinalized) resolve(status.asFinalized.toString());
          if (status.isDropped || status.isInvalid)
            reject(new Error("Transaction dropped/invalid"));
        }).catch(reject);
      });

      await provider.disconnect();

      return { success: true, txHash, gasCostUsd: 0.01 };
    } catch (err) {
      return { success: false, errorMessage: String(err) };
    }
  },
};
