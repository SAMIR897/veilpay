import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import fs from 'fs';
import path from 'path';

// Mock Decryption (Same as frontend/contract)
function decryptAmount(data: Uint8Array): number {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return Number(view.getBigUint64(0, true)); // LE
}

async function main() {
    // Configure client
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const walletPath = path.resolve(process.env.HOME!, ".config/solana/id.json");
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    const IDL = JSON.parse(fs.readFileSync("./target/idl/veilpay.json", "utf8"));
    const PROGRAM_ID = new PublicKey("5vKU63aqbKn5F4NWMnaMoq1jjSVSR8DNCFbfJnc4fPUZ");
    const program = new anchor.Program(IDL, provider);

    console.log("Debugging State...");

    // 1. Fetch Vault Balance
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        PROGRAM_ID
    );
    const vaultAccount = await connection.getAccountInfo(vaultPda);
    const vaultLamports = vaultAccount ? vaultAccount.lamports : 0;
    console.log(`\n🏦 Global Vault Balance: ${(vaultLamports / anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    // 2. Fetch User Balance (Wallet from config)
    const [balancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance"), wallet.publicKey.toBuffer()],
        PROGRAM_ID
    );

    try {
        // @ts-ignore
        const balanceAccount = await program.account.confidentialBalance.fetch(balancePda);
        const decryptedLamports = decryptAmount(Uint8Array.from(balanceAccount.encryptedBalance));

        console.log(`\n👤 User Encrypted Balance: ${(decryptedLamports / anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);
        console.log(`   (Raw Lamports): ${decryptedLamports}`);

        console.log("\n--- DIAGNOSIS ---");
        if (decryptedLamports > vaultLamports) {
            console.log("❌ DISCREPANCY DETECTED!");
            console.log(`User thinks they have: ${(decryptedLamports / anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);
            console.log(`But Vault only holds:  ${(vaultLamports / anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`);
            console.log("Reason: Previous bug inflated the user balance number without adding real SOL to vault.");
        } else {
            console.log("✅ Balances look consistent. Withdrawal should work.");
        }

    } catch (e) {
        console.log("Could not fetch user balance:", e);
    }
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
