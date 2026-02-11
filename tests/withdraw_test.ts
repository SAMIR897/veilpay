
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Veilpay } from "../target/types/veilpay";
import { assert } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("VeilPay - Withdrawal Test", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Veilpay as Program<Veilpay>;
    const sender = anchor.web3.Keypair.generate();
    let senderBalancePda: anchor.web3.PublicKey;
    let vaultPda: anchor.web3.PublicKey;

    // Helper function mock
    function encryptAmount(amount: number): number[] {
        const encrypted = new Array(64).fill(0);
        const amountBytes = Buffer.allocUnsafe(8);
        amountBytes.writeBigUint64LE(BigInt(amount), 0);
        for (let i = 0; i < 8; i++) {
            encrypted[i] = amountBytes[i];
        }
        return encrypted;
    }

    it("Setup: Fund and Init", async () => {
        // Airdrop
        const tx = await provider.connection.requestAirdrop(sender.publicKey, 2 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(tx, "confirmed");

        // Init Balance
        [senderBalancePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("balance"), sender.publicKey.toBuffer()],
            program.programId
        );
        await program.methods.initBalance()
            .accounts({
                confidentialBalance: senderBalancePda,
                owner: sender.publicKey,
                payer: sender.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([sender])
            .rpc();

        // Deposit
        [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);
        const depositAmount = 1 * LAMPORTS_PER_SOL;
        const encryptedDeposit = encryptAmount(depositAmount);

        await program.methods.deposit(new anchor.BN(depositAmount), encryptedDeposit)
            .accounts({
                confidentialBalance: senderBalancePda,
                vault: vaultPda,
                signer: sender.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([sender])
            .rpc();
    });

    it("Withdraws SOL successfully", async () => {
        const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);
        const senderBalanceBefore = await provider.connection.getBalance(sender.publicKey);

        const withdrawAmount = 0.5 * LAMPORTS_PER_SOL;
        const encryptedAmount = encryptAmount(withdrawAmount);

        await program.methods
            .withdraw(
                new anchor.BN(withdrawAmount),
                encryptedAmount
            )
            .accounts({
                confidentialBalance: senderBalancePda,
                vault: vaultPda,
                signer: sender.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([sender])
            .rpc();

        const vaultBalanceAfter = await provider.connection.getBalance(vaultPda);
        const senderBalanceAfter = await provider.connection.getBalance(sender.publicKey);

        assert.equal(vaultBalanceAfter, vaultBalanceBefore - withdrawAmount, "Vault balance check");
        assert.isAbove(senderBalanceAfter, senderBalanceBefore, "Sender balance check");
    });

    it("Fails to withdraw more than balance", async () => {
        const hugeAmount = 100 * LAMPORTS_PER_SOL; // More than deposited
        const encryptedAmount = encryptAmount(hugeAmount);

        try {
            await program.methods
                .withdraw(
                    new anchor.BN(hugeAmount),
                    encryptedAmount
                )
                .accounts({
                    confidentialBalance: senderBalancePda,
                    vault: vaultPda,
                    signer: sender.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([sender])
                .rpc();

            assert.fail("Should have failed due to insufficient funds");
        } catch (err: any) {
            assert.ok(err.toString().includes("InsufficientFunds") || err.toString().includes("0x1770"), "Error should be InsufficientFunds");
        }
    });
});
