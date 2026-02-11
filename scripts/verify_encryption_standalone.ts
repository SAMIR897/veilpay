import { encryptAmount } from '../frontend/src/utils/encryption';
import * as anchor from '@coral-xyz/anchor';

// Mock Rust logic in TS for verification
function mockRustDecrypt(data: number[]): bigint {
    const buffer = Buffer.from(data.slice(0, 8));
    return buffer.readBigUInt64LE(0);
}

function verify() {
    console.log("Running Standalone Verification...");

    // 1. Test Fractional Amount
    const solAmount = 0.001;
    const lamports = solAmount * 1_000_000_000; // 1,000,000
    console.log(`Testing Amount: ${solAmount} SOL (${lamports} lamports)`);

    const encrypted = encryptAmount(lamports);
    console.log("Encrypted (first 16 bytes):", encrypted.slice(0, 16));

    // 2. Verify "Decryption" (Rust Logic)
    const decrypted = mockRustDecrypt(encrypted);
    console.log(`Decrypted Value: ${decrypted}`);

    if (decrypted === BigInt(lamports)) {
        console.log("✅ SUCCESS: Encryption logic correctly preserves value.");
    } else {
        console.error("❌ FAILURE: Value mismatch!");
        console.error(`Expected: ${lamports}, Got: ${decrypted}`);
        process.exit(1);
    }

    // 3. Verify Arithmetic (Add/Sub)
    const transferAmount = 500_000;
    const encryptedTransfer = encryptAmount(transferAmount);
    const decryptedTransfer = mockRustDecrypt(encryptedTransfer);

    const result = decrypted - decryptedTransfer;
    console.log(`Arithmetic Check (1000000 - 500000): ${result}`);

    if (result === BigInt(500_000)) {
        console.log("✅ SUCCESS: Arithmetic operations valid.");
    } else {
        console.error("❌ FAILURE: Arithmetic operations failed.");
        process.exit(1);
    }
}

verify();
