import { PublicKey } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { Buffer } from "buffer";

// Helper function to create encrypted amount (matching Rust implementation)
// In production, this would use Arcium SDK encryption
export function encryptAmount(amount: number): number[] {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigUint64(0, BigInt(amount), true);
    const amountBytes = Buffer.from(buffer);

    // Match the Rust encrypt_amount function logic
    const encrypted = new Array(64).fill(0);

    // Generate c1 (first 32 bytes) using keccak hash of amount + "c1"
    const c1Input = Buffer.concat([amountBytes, Buffer.from("c1")]);
    const c1Hash = utils.sha256.hash(c1Input.toString('hex'));
    // sha256.hash returns a string hex, we need bytes
    const c1HashBytes = Buffer.from(c1Hash, 'hex');
    encrypted.splice(0, 32, ...Array.from(c1HashBytes));

    // Generate c2 (last 32 bytes) using keccak hash of amount + "c2"
    const c2Input = Buffer.concat([amountBytes, Buffer.from("c2")]);
    const c2Hash = utils.sha256.hash(c2Input.toString('hex'));
    const c2HashBytes = Buffer.from(c2Hash, 'hex');
    encrypted.splice(32, 32, ...Array.from(c2HashBytes));

    return encrypted;
}

// Helper function to generate commitment hash (deterministic for testing)
export function generateCommitmentHash(
    encryptedAmount: number[],
    nonce: number,
    recipientPubkey: PublicKey
): number[] {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigUint64(0, BigInt(nonce), true);
    const nonceBytes = Buffer.from(buffer);

    // Create deterministic hash for testing
    const combined = Buffer.concat([
        Buffer.from(encryptedAmount),
        nonceBytes,
        recipientPubkey.toBuffer(),
    ]);

    // Simple deterministic hash for testing
    const hash = new Array(32).fill(0);
    for (let i = 0; i < 32; i++) {
        hash[i] = combined[i % combined.length] ^ (nonce % 256);
    }

    return hash;
}

// Helper function to generate encrypted tag (deterministic for testing)
export function generateEncryptedTag(
    recipientPubkey: PublicKey,
    senderSecret: Buffer
): number[] {
    const combined = Buffer.concat([
        recipientPubkey.toBuffer(),
        senderSecret,
    ]);

    // Simple deterministic tag for testing
    const tag = new Array(32).fill(0);
    for (let i = 0; i < 32; i++) {
        tag[i] = combined[i % combined.length];
    }

    return tag;
}
