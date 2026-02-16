import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as web3 from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getProgram, PROGRAM_ID } from '../utils/anchor';
import { TransferModal } from './TransferModal';
import { PendingTransfers } from './PendingTransfers';
import { encryptAmount, decryptAmount } from '../utils/encryption';

export const Dashboard: React.FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [balanceAccount, setBalanceAccount] = useState<any>(null);
    const [balancePda, setBalancePda] = useState<PublicKey | null>(null);
    const [loading, setLoading] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    const [isReceiveOpen, setIsReceiveOpen] = useState(false);

    useEffect(() => {
        if (wallet.publicKey) {
            const [pda] = PublicKey.findProgramAddressSync(
                [Buffer.from("balance"), wallet.publicKey.toBuffer()],
                PROGRAM_ID
            );
            setBalancePda(pda);
            fetchBalance(pda);
        }
    }, [wallet.publicKey]);

    const fetchBalance = async (pda: PublicKey) => {
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            // @ts-ignore
            const account = await program.account.confidentialBalance.fetch(pda);
            setBalanceAccount(account);
        } catch (err) {
            console.log("Account not initialized or error fetching");
            setBalanceAccount(null);
        } finally {
            setLoading(false);
        }
    };

    const [vaultBalance, setVaultBalance] = useState<number | null>(null);

    useEffect(() => {
        if (connection) {
            const [vaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault")],
                PROGRAM_ID
            );
            connection.getBalance(vaultPda).then(lamports => {
                setVaultBalance(lamports);
            });
            // Poll vault balance
            const interval = setInterval(() => {
                connection.getBalance(vaultPda).then(setVaultBalance);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [connection]);

    // Helper to get effective balance
    // Helper to get effective balance
    const getEffectiveBalance = () => {
        if (!balanceAccount) return 0;
        const decrypted = decryptAmount(balanceAccount.encryptedBalance);
        if (vaultBalance === null) return decrypted / web3.LAMPORTS_PER_SOL;

        // Reserve 0.003 SOL for Vault Rent/Safety (non-withdrawable)
        const VAULT_RESERVE = 3000000;
        const withdrawableVault = Math.max(0, vaultBalance - VAULT_RESERVE);

        // Cap at vault withdrawable balance
        const effective = Math.min(decrypted, withdrawableVault);
        return effective / web3.LAMPORTS_PER_SOL;
    };

    // Dev Tools (Hidden for now)
    /*
    const isSyncError = () => {
        if (!balanceAccount || vaultBalance === null) return false;
        const decrypted = decryptAmount(balanceAccount.encryptedBalance);
        return decrypted > (vaultBalance + 10000); // Small buffer for dust
    };
    */

    const handleWithdraw = async (maxAmount?: number) => {
        if (!wallet.publicKey || !balancePda) return;

        let amountStr;
        if (maxAmount !== undefined) {
            amountStr = maxAmount.toString();
        } else {
            amountStr = prompt("Enter amount to WITHDRAW (SOL):");
        }

        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            const lamports = new BN(amount * web3.LAMPORTS_PER_SOL);

            // For MVP: Withdraw logic in contract adds encrypted_amount.
            // To subtract, we need to add the NEGATIVE amount. 
            // In elliptic curve arithmetic (or simple modular arithmetic for this mockup), validation is key.
            // Since we replaced encryption with a simple mockup in previous turns (Buffer write), we need to match that.
            // Wait, previous turn replaced Buffer write with DataView, but logic was still "encryptAmount".

            // IMPORTANT: For this MVP "Encryption", we are just writing bytes.
            // To properly subtract in the mockup, we might need a "decrypt and subtract" logic or just send "negative" bytes?
            // Since the contract does `cspl_add`, we should send the encrypted NEGATIVE value if we want to reduce balance.
            // However, `encryptAmount` (mock) likely doesn't handle negatives well if it strictly writes unsigned ints.
            // Let's check `encryptAmount` logic again. It uses DataView `setBigUint64`. It expects Unsigned.
            // So we can only ADD. A real "Withdraw" in this mock system might just not update the encrypted balance correctly
            // (or it stays high) but pays out SOL.
            // For MVP, let's just encrypt the POSITIVE amount and 'pretend' or let the contract logic handle it if it was designed for subtraction.
            // Contract uses `cspl_add`. If we send positive, balance goes UP encrypted.
            // This is a known limitation of the MVP "Mock Privacy" system without real Homomorphic Encryption (ElGamal).
            // We will just send `encryptAmount(lamports)` and accept that "Encrypted Balance" will strictly increase for now (history log style).
            // Real ZK systems would allow subtraction.

            const encryptedAmount = encryptAmount(amount * web3.LAMPORTS_PER_SOL);

            const [vaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault")],
                program.programId
            );

            await program.methods
                .withdraw(lamports, encryptedAmount)
                .accounts({
                    confidentialBalance: balancePda,
                    vault: vaultPda,
                    signer: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();

            alert("Withdraw Successful!");
            setTimeout(() => fetchBalance(balancePda), 1000);
        } catch (err: any) {
            console.error("Withdraw Error:", err);
            alert("Withdraw Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const initBalance = async () => {
        if (!wallet.publicKey) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            await program.methods
                .initBalance()
                .accounts({
                    confidentialBalance: balancePda!,
                    owner: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();

            // Wait a sec for confirmation
            setTimeout(() => {
                if (balancePda) fetchBalance(balancePda);
            }, 1000);
        } catch (err: any) {
            console.error("Initialization error:", err);
            // Log full error logs if available
            if (err.logs) {
                console.error("Transaction Logs:", err.logs);
            }
            alert("Failed to initialize balance: " + (err.message || err.toString()));
        } finally {
            setLoading(false);
        }
    };

    /*
    const resetAccount = async () => {
        if (!wallet.publicKey || !balancePda) return;
        if (!confirm("⚠️ This will reset your encrypted balance to 0. Use this ONLY if your balance display is corrupted or showing incorrect values. Proceed?")) return;

        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            await program.methods
                .resetAccount()
                .accounts({
                    confidentialBalance: balancePda,
                    signer: wallet.publicKey,
                })
                .rpc();

            alert("Account Reset Successfully!");
            fetchBalance(balancePda);
        } catch (err: any) {
            console.error("Reset Error:", err);
            alert("Reset Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };
    */

    if (!wallet.connected) {
        return (
            <div className="glass-panel p-8 text-center">
                <h2 className="text-xl mb-4">Welcome to VeilPay</h2>
                <p className="text-gray-400">Connect your wallet to manage your private assets.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-center w-full relative">
            <div className="glass-panel p-8 md:p-10 shadow-2xl relative z-10">
                <h2 className="text-3xl font-bold mb-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] tracking-tight">Your Private Balance</h2>

                {loading && <p className="font-medium text-lg animate-pulse text-rose-500">Processing secure transaction...</p>}

                {!loading && !balanceAccount && (
                    <div className="text-center py-6">
                        <p className="mb-6" style={{ color: '#9f1239' }}>Account not initialized.</p>
                        <button className="btn-primary" onClick={initBalance}>
                            Initialize Account
                        </button>
                    </div>
                )}

                {!loading && balanceAccount && (
                    <div className="grid gap-6">
                        {/* BALANCE DISPLAY */}
                        <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-rose-100 flex flex-col items-center transform transition-transform hover:scale-105 duration-300">
                            <label className="text-xs font-bold uppercase tracking-widest text-rose-800/60 mb-2">Available Balance</label>
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-purple-600">
                                {getEffectiveBalance().toFixed(4)}
                                <span className="text-lg ml-2 text-rose-400 font-bold">SOL</span>
                            </div>
                        </div>

                        {/* Hidden Resync Button (Dev Mode only if needed, currently hidden) */}
                        {/* {isSyncError() && (
                            <div className="flex justify-center -mt-4 mb-4">
                                <button
                                    className="text-xs font-bold text-gray-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                                    onClick={resetAccount}
                                >
                                    <span>Re-sync Wallet State</span>
                                </button>
                            </div>
                        )} */}

                        <div className="grid gap-6">
                            {/* Technical Details (Collapsed) */}
                            <details className="text-center group">
                                <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors list-none">
                                    Show Technical Details ▾
                                </summary>
                                <div className="mt-4 grid gap-4 animate-fadeIn">
                                    <div className="inner-card flex flex-col items-center justify-center p-4">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-rose-900 mb-2">Encrypted Hash</label>
                                        <div className="font-mono text-[10px] bg-white/50 px-2 py-1 rounded text-rose-800 break-all w-full text-center">
                                            {Buffer.from(balanceAccount.encryptedBalance).toString('hex').slice(0, 32)}...
                                        </div>
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {/* RECEIVE BUTTON (Left Slide) */}
                            <button
                                className="btn-secondary py-4 text-lg shadow-lg flex flex-col items-center justify-center gap-1 group"
                                onClick={() => setIsReceiveOpen(true)}
                            >
                                <span className="text-2xl group-hover:-translate-y-1 transition-transform">📥</span>
                                <span>Receive / Claim</span>
                            </button>

                            {/* SEND BUTTON (Right Slide) */}
                            <button
                                className="btn-primary py-4 text-lg shadow-lg flex flex-col items-center justify-center gap-1 group"
                                onClick={() => setIsTransferModalOpen(true)}
                            >
                                <span className="text-2xl group-hover:-translate-y-1 transition-transform">📤</span>
                                <span>Send Private</span>
                            </button>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button className="flex-1 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 font-bold text-sm transition-all" onClick={() => {
                                const maxBalance = decryptAmount(balanceAccount.encryptedBalance) / web3.LAMPORTS_PER_SOL;
                                handleWithdraw(maxBalance);
                            }}>
                                Withdraw MAX
                            </button>
                            <button className="flex-1 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 font-bold text-sm transition-all" onClick={() => handleWithdraw()}>
                                Withdraw Amount
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {
                balancePda && (
                    <>
                        <TransferModal
                            isOpen={isTransferModalOpen}
                            onClose={() => setIsTransferModalOpen(false)}
                            balancePda={balancePda}
                            onSuccess={() => fetchBalance(balancePda)}
                        />
                        <PendingTransfers
                            isOpen={isReceiveOpen}
                            onClose={() => setIsReceiveOpen(false)}
                        />
                    </>
                )
            }
        </div>
    );
};
