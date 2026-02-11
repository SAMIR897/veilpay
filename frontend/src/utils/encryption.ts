import { PublicKey } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { Buffer } from "buffer";

// Helper function to create encrypted amount (matching Rust implementation)
// In production, this would use Arcium SDK encryption
// Helper function to create encrypted amount (Simple Arithmetic Mock)
// In production, this would use Arcium SDK encryption
export function encryptAmount(amount: number): number[] {
    const encrypted = new Array(64).fill(0);

    // Store the amount directly in the first 8 bytes (Little Endian)
    // This allows the Rust program to perform "homomorphic" operations by just adding/subtracting these bytes
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigUint64(0, BigInt(amount), true);
    const amountBytes = Buffer.from(buffer);

    // Copy amount to first 8 bytes
    for (let i = 0; i < 8; i++) {
        encrypted[i] = amountBytes[i];
    }

    // Fill the rest with deterministic noise (hash of amount) to look like ciphertext
    const noiseInput = Buffer.concat([amountBytes, Buffer.from("noise")]);
    const noiseHash = utils.sha256.hash(noiseInput.toString('hex'));
    const noiseBytes = Buffer.from(noiseHash, 'hex');

    // Fill bytes 8..40 with noise
    for (let i = 0; i < 32; i++) {
        encrypted[8 + i] = noiseBytes[i];
    }

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
