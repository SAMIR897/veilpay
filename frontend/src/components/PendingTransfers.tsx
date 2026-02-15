import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as web3 from '@solana/web3.js';
import { getProgram } from '../utils/anchor';

interface PendingTransfer {
    publicKey: PublicKey;
    account: {
        sender: PublicKey;
        recipient: PublicKey;
        amount: { toNumber: () => number }; // BN
        timestamp: { toNumber: () => number }; // BN
    }
}

export interface PendingTransfersProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PendingTransfers: React.FC<PendingTransfersProps> = ({ isOpen, onClose }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [incoming, setIncoming] = useState<PendingTransfer[]>([]);
    const [outgoing, setOutgoing] = useState<PendingTransfer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (wallet.publicKey && isOpen) {
            fetchPendingTransfers();
            // Poll for updates every 5s
            const interval = setInterval(fetchPendingTransfers, 5000);
            return () => clearInterval(interval);
        }
    }, [wallet.publicKey, isOpen]);

    const fetchPendingTransfers = async () => {
        if (!wallet.publicKey) return;
        try {
            const program = getProgram(connection, wallet);
            // Fetch ALL pending transfers (not efficient for production, but fine for hackathon MVP)
            // Ideally we use getProgramAccounts with memcmp filters
            // @ts-ignore
            const allTransfers = await program.account.pendingTransfer.all();

            const myIncoming = allTransfers.filter((t: any) =>
                t.account.recipient.toBase58() === wallet.publicKey?.toBase58()
            );
            const myOutgoing = allTransfers.filter((t: any) =>
                t.account.sender.toBase58() === wallet.publicKey?.toBase58()
            );

            setIncoming(myIncoming);
            setOutgoing(myOutgoing);
        } catch (err) {
            console.error("Error fetching transfers:", err);
        }
    };

    const handleClaim = async (transfer: PendingTransfer) => {
        if (!wallet.publicKey) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);

            // Need receiver balance PDA
            const [balancePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("balance"), wallet.publicKey.toBuffer()],
                program.programId
            );

            // Check if balance account exists, if not init
            // @ts-ignore
            const balanceAccount = await connection.getAccountInfo(balancePda);
            const tx = new web3.Transaction();

            if (!balanceAccount) {
                const initIx = await program.methods
                    .initBalance()
                    .accounts({
                        confidentialBalance: balancePda,
                        owner: wallet.publicKey,
                        payer: wallet.publicKey,
                    })
                    .instruction();
                tx.add(initIx);
            }

            const claimIx = await program.methods
                .claimTransfer()
                .accounts({
                    recipientBalance: balancePda,
                    pendingTransfer: transfer.publicKey,
                    recipient: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .instruction();

            tx.add(claimIx);

            const signature = await wallet.sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, "processed");
            alert("Transfer Claimed Successfully!");
            fetchPendingTransfers();
        } catch (err: any) {
            console.error(err);
            alert("Claim Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (transfer: PendingTransfer) => {
        if (!wallet.publicKey) return;
        if (!confirm("Are you sure you want to cancel this transfer and refund funds?")) return;

        try {
            setLoading(true);
            const program = getProgram(connection, wallet);

            // Need sender balance PDA
            const [balancePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("balance"), wallet.publicKey.toBuffer()],
                program.programId
            );

            await program.methods
                .cancelTransfer()
                .accounts({
                    senderBalance: balancePda,
                    pendingTransfer: transfer.publicKey,
                    sender: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();

            alert("Transfer Cancelled & Refunded!");
            fetchPendingTransfers();
        } catch (err: any) {
            console.error(err);
            alert("Cancel Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="absolute inset-y-0 left-0 w-full max-w-md flex pointer-events-none">
                <div className="w-full h-full bg-white/95 backdrop-blur-xl p-8 shadow-2xl border-r border-rose-200 transform transition-transform animate-slideInLeft pointer-events-auto overflow-y-auto">

                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-rose-900 tracking-tight">Receive & Pending</h2>
                        <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full text-rose-400 hover:text-rose-600 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* INCOMING */}
                        <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Incoming to You
                            </h4>
                            {incoming.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No incoming transfers.</p>}
                            <div className="space-y-4">
                                {incoming.map(t => (
                                    <div key={t.publicKey.toBase58()} className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-900 font-bold text-lg">
                                                {(t.account.amount.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded break-all">
                                            From: {t.account.sender.toBase58()}
                                        </div>
                                        <button
                                            className="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full py-3 text-sm mt-1 shadow-md"
                                            onClick={() => handleClaim(t)}
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : 'Claim Funds'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* OUTGOING */}
                        <div className="border border-amber-100 bg-amber-50/30 rounded-2xl p-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Outgoing (Pending)
                            </h4>
                            {outgoing.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No pending outgoing.</p>}
                            <div className="space-y-4">
                                {outgoing.map(t => (
                                    <div key={t.publicKey.toBase58()} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-amber-900 font-bold text-lg">
                                                {(t.account.amount.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded break-all">
                                            To: {t.account.recipient.toBase58()}
                                        </div>
                                        <button
                                            className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors w-full text-sm font-bold mt-1 shadow-sm"
                                            onClick={() => handleCancel(t)}
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : 'Cancel & Refund'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
