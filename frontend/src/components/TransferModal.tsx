import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram } from '../utils/anchor'; // Adjust import path
import { encryptAmount, generateCommitmentHash, generateEncryptedTag } from '../utils/encryption';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    balancePda: PublicKey;
    onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, balancePda, onSuccess }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTransfer = async () => {
        if (!wallet.publicKey) return;
        setLoading(true);
        setError(null);

        try {
            const program = getProgram(connection, wallet);

            // 1. Process inputs
            // 1. Process inputs
            const recipientPubkey = new PublicKey(recipient);
            const transferSolAmount = parseFloat(amount);
            console.log("Transfer SOL:", transferSolAmount);
            if (isNaN(transferSolAmount) || transferSolAmount <= 0) throw new Error("Invalid amount");

            // Convert to Lamports (Integer) to avoid BigInt 0.18 error
            const lamports = Math.round(transferSolAmount * anchor.web3.LAMPORTS_PER_SOL);
            console.log("Transfer Lamports:", lamports);

            // 2. Encryption (Client-side privacy)
            const encryptedAmount = encryptAmount(lamports);

            // Derive secret from wallet signature (Polished Security)
            if (!wallet.signMessage) throw new Error("Wallet does not support message signing!");
            const message = new TextEncoder().encode("VeilPay Privacy: Sign to derive encryption key");
            const authSignature = await wallet.signMessage(message);
            const signatureHex = Buffer.from(authSignature).toString('hex');
            const secretHash = anchor.utils.sha256.hash(signatureHex);
            const senderSecret = Buffer.from(secretHash, 'hex');

            const encryptedTag = generateEncryptedTag(recipientPubkey, senderSecret);

            // 2b. Get current nonce & Check Sender Account
            let currentNonce = 0;
            let senderNeedsInit = false;

            // Checks if sender account exists
            const senderAccountInfo = await connection.getAccountInfo(balancePda);
            if (senderAccountInfo) {
                // @ts-ignore
                const balanceAccount = await program.account.confidentialBalance.fetch(balancePda);
                currentNonce = balanceAccount.nonce.toNumber();
            } else {
                console.log("New user detected, auto-initializing account...");
                senderNeedsInit = true;
                currentNonce = 0;
            }

            const commitmentHash = generateCommitmentHash(
                encryptedAmount,
                currentNonce,
                recipientPubkey
            );

            // 3. Find recipient balance account
            const [receiverBalancePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("balance"), recipientPubkey.toBuffer()],
                program.programId
            );

            // 4. Build Transaction
            const tx = new anchor.web3.Transaction();

            // Auto-Init Sender if needed
            if (senderNeedsInit) {
                const initSenderIx = await program.methods
                    .initBalance()
                    .accounts({
                        confidentialBalance: balancePda,
                        owner: wallet.publicKey,
                        payer: wallet.publicKey,
                    })
                    .instruction();
                tx.add(initSenderIx);
            }

            // Check if receiver account exists
            // @ts-ignore
            const receiverAccountInfo = await connection.getAccountInfo(receiverBalancePda);

            if (!receiverAccountInfo) {
                console.log("Initializing receiver account...");
                const initIx = await program.methods
                    .initBalance()
                    .accounts({
                        confidentialBalance: receiverBalancePda,
                        owner: recipientPubkey,
                        payer: wallet.publicKey,
                    })
                    .instruction();
                tx.add(initIx);
            }

            // AUTO-DEPOSIT: Pay-as-you-go privacy
            // We deposit the exact amount we want to transfer, ensuring the user always has funds.
            // This treats the Privacy Layer as a "Passthrough" or "Mixer".
            const depositLamports = new anchor.BN(lamports);
            const encryptedDepositAmount = encryptAmount(lamports);

            const [vaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault")],
                program.programId
            );

            const depositIx = await program.methods
                .deposit(depositLamports, encryptedDepositAmount)
                .accounts({
                    confidentialBalance: balancePda,
                    vault: vaultPda,
                    signer: wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .instruction();
            tx.add(depositIx);

            const transferIx = await program.methods
                .privateTransfer(
                    encryptedAmount,
                    new anchor.BN(currentNonce),
                    commitmentHash,
                    encryptedTag
                )
                .accounts({
                    senderBalance: balancePda,
                    receiverBalance: receiverBalancePda,
                    sender: wallet.publicKey,
                })
                .instruction();

            tx.add(transferIx);

            // Send and confirm
            // Re-adding the sendTransaction logic which was at the end of the block I'm replacing
            const signature = await wallet.sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, "processed");

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Full Transfer Error:", err);
            // Check for common Anchor errors
            if (err.logs) {
                console.error("Tx Logs:", err.logs);
            }
            setError(err.message || "Unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
            <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>
            <div className="bg-white/95 backdrop-blur-xl p-8 w-full max-w-md relative z-10 transform transition-all scale-100 animate-fadeIn shadow-2xl border border-rose-200 rounded-2xl">
                <div className="flex justify-center mb-6">
                    <h2 className="text-xl font-bold text-white bg-rose-600 py-2 px-8 rounded-full shadow-lg tracking-wide uppercase">
                        Private Transfer
                    </h2>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 transition-colors hover:bg-rose-50 focus-within:bg-white focus-within:border-rose-300 focus-within:shadow-md">
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-rose-800/70 mb-2 pl-1">Recipient Address</label>
                        <input
                            type="text"
                            className="w-full bg-transparent text-rose-900 placeholder-rose-300/50 font-mono text-sm focus:outline-none"
                            placeholder="Paste Solana Public Key"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                        />
                    </div>

                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 transition-colors hover:bg-rose-50 focus-within:bg-white focus-within:border-rose-300 focus-within:shadow-md">
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-rose-800/70 mb-2 pl-1">Amount</label>
                        <div className="flex items-center">
                            <input
                                type="number"
                                className="w-full bg-transparent text-2xl font-bold text-rose-900 placeholder-rose-200 focus:outline-none"
                                placeholder="0.00"
                                min="0"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider ml-2 bg-rose-100 px-2 py-1 rounded">SOL</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
                        <button
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleTransfer}
                            disabled={loading || !recipient || !amount}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    processing
                                </span>
                            ) : 'Send Private'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
