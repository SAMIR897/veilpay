import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

// Import the IDL (will be auto-copied by deploy script)
import idl from "../idl/veilpay.json";

// Import the dynamically generated deployment config
// If this file is missing (fresh clone), we might fallback or error gracefully
let deploymentConfig = { programId: "5vKU63aqbKn5F4NWMnaMoq1jjSVSR8DNCFbfJnc4fPUZ" }; // Default/Fallback
try {
    // @ts-ignore
    deploymentConfig = require("../idl/deployment.json");
} catch (e) {
    console.warn("deployment.json not found, using default/fallback Program ID.");
}

export const PROGRAM_ID = new PublicKey(deploymentConfig.programId);

export const getProgram = (connection: Connection, wallet: any) => {
    const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
    });
    setProvider(provider);
    const program = new Program(idl as any, provider);
    console.log("VeilPay Program Methods:", Object.keys(program.methods));
    return program;
};
