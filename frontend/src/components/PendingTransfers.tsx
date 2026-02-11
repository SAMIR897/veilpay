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

export const PendingTransfers: React.FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [incoming, setIncoming] = useState<PendingTransfer[]>([]);
    const [outgoing, setOutgoing] = useState<PendingTransfer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (wallet.publicKey) {
            fetchPendingTransfers();
            // Poll for updates every 5s
            const interval = setInterval(fetchPendingTransfers, 5000);
            return () => clearInterval(interval);
        }
    }, [wallet.publicKey]);

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

    if (!wallet.publicKey) return null;

    if (incoming.length === 0 && outgoing.length === 0) return null;

    return (
        <div className="w-full mt-8 animate-fadeIn">
            <h3 className="text-xl font-bold text-rose-900 mb-6 text-center tracking-tight">Pending Transfers</h3>

            <div className="grid md:grid-cols-2 gap-8">
                {/* INCOMING */}
                <div className="glass-panel p-6 border-l-4 border-l-emerald-400">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Incoming to You
                    </h4>
                    {incoming.length === 0 && <p className="text-sm text-gray-400 italic">No incoming transfers.</p>}
                    <div className="space-y-4">
                        {incoming.map(t => (
                            <div key={t.publicKey.toBase58()} className="bg-white/60 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-emerald-900 font-bold text-lg">
                                        {(t.account.amount.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                        From: {t.account.sender.toBase58().slice(0, 4)}...{t.account.sender.toBase58().slice(-4)}
                                    </span>
                                </div>
                                <button
                                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full py-2 text-sm mt-2"
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
                <div className="glass-panel p-6 border-l-4 border-l-amber-400">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-amber-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Outgoing (Pending)
                    </h4>
                    {outgoing.length === 0 && <p className="text-sm text-gray-400 italic">No pending outgoing transfers.</p>}
                    <div className="space-y-4">
                        {outgoing.map(t => (
                            <div key={t.publicKey.toBase58()} className="bg-white/60 p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-amber-900 font-bold text-lg">
                                        {(t.account.amount.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                        To: {t.account.recipient.toBase58().slice(0, 4)}...{t.account.recipient.toBase58().slice(-4)}
                                    </span>
                                </div>
                                <button
                                    className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors w-full text-sm font-bold mt-2"
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
    );
};
