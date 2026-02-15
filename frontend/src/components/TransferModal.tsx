import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram } from '../utils/anchor'; // Adjust import path
import { encryptAmount } from '../utils/encryption';

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



            // 3. Derive Pending Transfer PDA
            // We need the nonce to derive the unique PDA for this transfer
            // We already fetched currentNonce above.
            // PENDING_TRANSFER_SEED = "pending_transfer"
            // Seeds: ["pending_transfer", sender, recipient, nonce_le_bytes]

            // Convert nonce to Little Endian Buffer (8 bytes)
            const nonceBuffer = new anchor.BN(currentNonce).toArrayLike(Buffer, 'le', 8);

            const [pendingTransferPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("pending_transfer"),
                    wallet.publicKey.toBuffer(),
                    recipientPubkey.toBuffer(),
                    nonceBuffer
                ],
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

            // AUTO-DEPOSIT: Pay-as-you-go privacy
            // We deposit the exact amount we want to transfer, ensuring the user always has funds.
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

            // CREATE TRANSFER (Escrow)
            // Note: We don't need to init receiver account! They can do it when they claim.
            const createTransferIx = await program.methods
                .createTransfer(
                    new anchor.BN(lamports),
                    encryptedAmount,
                    recipientPubkey
                )
                .accounts({
                    senderBalance: balancePda,
                    pendingTransfer: pendingTransferPda,
                    sender: wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .instruction();

            tx.add(createTransferIx);

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
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="absolute inset-y-0 right-0 w-full max-w-md flex pointer-events-none">
                <div className="w-full h-full bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-l border-rose-200 transform transition-transform animate-slideInRight pointer-events-auto overflow-y-auto">

                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-rose-900 tracking-tight">Send Private</h2>
                        <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full text-rose-400 hover:text-rose-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
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
                                    className="w-full bg-transparent text-3xl font-bold text-rose-900 placeholder-rose-200 focus:outline-none"
                                    placeholder="0.00"
                                    min="0"
                                    step="any"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <span className="text-sm font-bold text-rose-400 uppercase tracking-wider ml-2 bg-rose-100 px-2 py-1 rounded">SOL</span>
                            </div>
                        </div>

                        <div className="pt-8">
                            <button
                                className="btn-primary w-full py-4 text-lg shadow-xl"
                                onClick={handleTransfer}
                                disabled={loading || !recipient || !amount}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Processing Secure Transfer...
                                    </span>
                                ) : 'Slide to Send →'}
                            </button>
                            <p className="text-center text-xs text-rose-300 mt-4">
                                Secure. Private. Encrypted.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
