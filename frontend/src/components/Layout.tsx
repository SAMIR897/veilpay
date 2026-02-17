import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

import MatrixRain from './MatrixRain';

interface LayoutProps {
    children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    // const network = WalletAdapterNetwork.Devnet; // Unused for now as we define endpoint manually

    // You can also provide a custom RPC endpoint.
    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => "https://api.devnet.solana.com", []);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div className="fixed inset-0 w-full h-full bg-black flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
                        <MatrixRain />
                        <div className="w-full max-w-3xl space-y-12 relative z-10">
                            <header className="flex flex-col md:flex-row justify-between items-center w-full gap-6 relative z-50">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-bold tracking-tight text-[#e11d48] drop-shadow-sm">
                                        VeilPay
                                    </h1>
                                </div>
                                <div className="transform hover:scale-105 transition-transform relative z-50">
                                    <WalletMultiButton />
                                </div>
                            </header>
                            <main className="w-full relative z-0">
                                {children}
                            </main>
                        </div>
                    </div>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
