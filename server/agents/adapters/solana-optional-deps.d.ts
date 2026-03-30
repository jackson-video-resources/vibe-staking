// Type stubs for optional Solana packages not installed in base setup.
// Install when using Jito/Marinade adapters:
//   npm i @solana/spl-stake-pool @marinade.finance/marinade-ts-sdk

declare module "@solana/spl-stake-pool" {
  import type {
    Connection,
    PublicKey,
    TransactionInstruction,
    Signer,
  } from "@solana/web3.js";
  export function stakePoolInfo(
    connection: Connection,
    stakePoolAddress: PublicKey,
  ): Promise<unknown>;
  export function depositSol(
    connection: Connection,
    stakePoolAddress: PublicKey,
    from: PublicKey,
    lamports: number,
    destinationTokenAccount?: PublicKey,
    referrerTokenAccount?: PublicKey,
    managerFeeAccount?: PublicKey,
    poolMint?: PublicKey,
    tokenProgramId?: PublicKey,
  ): Promise<{ instructions: TransactionInstruction[]; signers: Signer[] }>;
  export function withdrawSol(
    connection: Connection,
    stakePoolAddress: PublicKey,
    tokenOwner: PublicKey,
    solReceiver: PublicKey,
    lamports: number,
  ): Promise<{ instructions: TransactionInstruction[]; signers: Signer[] }>;
}

declare module "@marinade.finance/marinade-ts-sdk" {
  import type { Connection } from "@solana/web3.js";
  export class MarinadeConfig {
    constructor(config: { connection: Connection; publicKey?: unknown });
  }
  export class Marinade {
    constructor(config: MarinadeConfig);
    deposit(
      lamports: number,
    ): Promise<{
      transaction: { sign(signers: unknown[]): void; serialize(): Buffer };
    }>;
    liquidUnstake(
      msolLamports: number,
    ): Promise<{
      transaction: { sign(signers: unknown[]): void; serialize(): Buffer };
    }>;
  }
}
