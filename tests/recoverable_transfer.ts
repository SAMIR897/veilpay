import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Veilpay } from "../target/types/veilpay";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("Recoverable Transfers", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Veilpay as Program<Veilpay>;

    const sender = anchor.web3.Keypair.generate();
    const recipient = anchor.web3.Keypair.generate();

    let senderBalancePda: PublicKey;
    let recipientBalancePda: PublicKey;
    let vaultPda: PublicKey;

    // Mock encryption helper
    function encryptAmountMock(amount: number): number[] {
        const encrypted = new Array(64).fill(0);
        const buffer = new ArrayBuffer(8);
        // Use DataView to ensure consistent endianess
        const view = new DataView(buffer);
        view.setBigUint64(0, BigInt(amount), true); // true = little endian
        const bytes = new Uint8Array(buffer);

        for (let i = 0; i < 8; i++) {
            encrypted[i] = bytes[i];
        }
        return encrypted;
    }

    // Derive PDAs upfront
    before(async () => {
        // Airdrop funds
        try {
            await provider.connection.requestAirdrop(sender.publicKey, 10 * LAMPORTS_PER_SOL);
            await provider.connection.requestAirdrop(recipient.publicKey, 10 * LAMPORTS_PER_SOL);
        } catch (e) {
            console.log("Airdrop failed, hoping account has funds");
        }

        [senderBalancePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("balance"), sender.publicKey.toBuffer()],
            program.programId
        );
        [recipientBalancePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("balance"), recipient.publicKey.toBuffer()],
            program.programId
        );
        [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault")],
            program.programId
        );

        // Initialize Sender
        await program.methods.initBalance().accounts({
            confidentialBalance: senderBalancePda,
            owner: sender.publicKey,
            systemProgram: SystemProgram.programId,
        }).signers([sender]).rpc();

        // Initialize Recipient
        await program.methods.initBalance().accounts({
            confidentialBalance: recipientBalancePda,
            owner: recipient.publicKey,
            systemProgram: SystemProgram.programId,
        }).signers([recipient]).rpc();

        // Deposit to Sender to have balance
        const depositAmount = 5 * LAMPORTS_PER_SOL;
        await program.methods.deposit(
            new anchor.BN(depositAmount),
            encryptAmountMock(depositAmount)
        ).accounts({
            confidentialBalance: senderBalancePda,
            vault: vaultPda,
            signer: sender.publicKey,
            systemProgram: SystemProgram.programId,
        }).signers([sender]).rpc();
    });

    it("Can create a pending transfer", async () => {
        const transferAmount = 1 * LAMPORTS_PER_SOL;

        // Get sender nonce
        const senderAccount = await program.account.confidentialBalance.fetch(senderBalancePda);
        const nonce = senderAccount.nonce; // BN object

        // Derive Pending Transfer PDA
        // Must match seeds in create_transfer.rs: [PENDING_TRANSFER_SEED, sender, recipient, nonce]
        const [pendingTransferPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("pending_transfer"),
                sender.publicKey.toBuffer(),
                recipient.publicKey.toBuffer(),
                nonce.toArrayLike(Buffer, 'le', 8) // Ensure this matches struct layout expectation
            ],
            program.programId
        );

        await program.methods.createTransfer(
            new anchor.BN(transferAmount),
            encryptAmountMock(transferAmount),
            recipient.publicKey
        ).accounts({
            senderBalance: senderBalancePda,
            pendingTransfer: pendingTransferPda,
            sender: sender.publicKey,
            systemProgram: SystemProgram.programId,
        }).signers([sender]).rpc();

        // Verify
        const pendingAccount = await program.account.pendingTransfer.fetch(pendingTransferPda);
        assert.equal(pendingAccount.amount.toNumber(), transferAmount);
        assert.equal(pendingAccount.sender.toBase58(), sender.publicKey.toBase58());
    });
});
