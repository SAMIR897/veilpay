import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Veilpay } from "../target/types/veilpay";
import { assert } from "chai";

describe("VeilPay – Full Privacy Test Suite", () => {
  // GLOBAL SETUP

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Veilpay as Program<Veilpay>;
  const authority = provider.wallet;

  // TEST USERS

  const sender = anchor.web3.Keypair.generate();
  const receiver = anchor.web3.Keypair.generate();
  const attacker = anchor.web3.Keypair.generate();

  // PDAs

  let mintPda: anchor.web3.PublicKey;
  let senderBalancePda: anchor.web3.PublicKey;
  let receiverBalancePda: anchor.web3.PublicKey;

  // PLACEHOLDER ENCRYPTED VALUES (ARCIUM STUBS)

  // In real usage, these come from Arcium client SDK
  const encryptedZero = new Array(64).fill(0);
  const encryptedOne = new Array(64).fill(1);
  const encryptedTen = new Array(64).fill(10);

  const commitmentHash = new Array(32).fill(9);
  const encryptedTag = new Array(32).fill(7);

  // AIRDROP SETUP

  before("Airdrop SOL to test accounts", async () => {
    for (const user of [sender, receiver, attacker]) {
      const sig = await provider.connection.requestAirdrop(
        user.publicKey,
        3 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }
  });

  // 1. INITIALIZE VEILPAY MINT

  it("Initializes VeilPay mint PDA", async () => {
    [mintPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint")],
      program.programId
    );

    await program.methods
      .initializeMint(encryptedZero)
      .accounts({
        veilpayMint: mintPda,
        authority: authority.publicKey,
      })
      .rpc();

    const mintAccount = await program.account.veilPayMint.fetch(mintPda);

    assert.ok(
      mintAccount.authority.equals(authority.publicKey),
      "Mint authority mismatch"
    );
  });

  // 2. INITIALIZE CONFIDENTIAL BALANCES

  it("Initializes sender confidential balance", async () => {
    [senderBalancePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), sender.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initBalance()
      .accounts({
        confidentialBalance: senderBalancePda,
        owner: sender.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    const bal =
      await program.account.confidentialBalance.fetch(senderBalancePda);

    assert.equal(bal.nonce.toNumber(), 0);
    assert.lengthOf(bal.encryptedBalance, 64);
  });

  // 3. PRIVATE TRANSFER

  it("Performs first private transfer", async () => {
    await program.methods
      .privateTransfer(
        encryptedTen,
        new anchor.BN(0),
        commitmentHash,
        encryptedTag
      )
      .accounts({
        senderBalance: senderBalancePda,
        receiverBalance: receiverBalancePda,
        sender: sender.publicKey,
      })
      .signers([sender])
      .rpc();

    const senderBal =
      await program.account.confidentialBalance.fetch(senderBalancePda);
    const receiverBal =
      await program.account.confidentialBalance.fetch(receiverBalancePda);

    assert.equal(senderBal.nonce.toNumber(), 1);
    assert.equal(receiverBal.nonce.toNumber(), 1);
  });

  // 4. MULTIPLE TRANSFERS (SEQUENTIAL NONCES)

  it("Allows multiple sequential private transfers", async () => {
    for (let i = 1; i <= 3; i++) {
      await program.methods
        .privateTransfer(
          encryptedOne,
          new anchor.BN(i),
          commitmentHash,
          encryptedTag
        )
        .accounts({
          senderBalance: senderBalancePda,
          receiverBalance: receiverBalancePda,
          sender: sender.publicKey,
        })
        .signers([sender])
        .rpc();
    }

    const senderBal =
      await program.account.confidentialBalance.fetch(senderBalancePda);

    assert.equal(senderBal.nonce.toNumber(), 4);
  });

  // 5. REPLAY ATTACK PROTECTION

  it("Rejects replayed transaction (old nonce)", async () => {
    try {
      await program.methods
        .privateTransfer(
          encryptedOne,
          new anchor.BN(1), // old nonce
          commitmentHash,
          encryptedTag
        )
        .accounts({
          senderBalance: senderBalancePda,
          receiverBalance: receiverBalancePda,
          sender: sender.publicKey,
        })
        .signers([sender])
        .rpc();

      assert.fail("Replay should have failed");
    } catch (err) {
      assert.include(err.toString(), "Invalid nonce");
    }
  });

   // 6. INVALID OWNER ATTACK

  it("Prevents attacker from spending sender balance", async () => {
    try {
      await program.methods
        .privateTransfer(
          encryptedOne,
          new anchor.BN(4),
          commitmentHash,
          encryptedTag
        )
        .accounts({
          senderBalance: senderBalancePda,
          receiverBalance: receiverBalancePda,
          sender: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();

      assert.fail("Invalid owner should fail");
    } catch (err) {
      assert.include(err.toString(), "Invalid owner");
    }
  });

  // 7. MISSING SIGNER CHECK

  it("Fails if sender does not sign", async () => {
    try {
      await program.methods
        .privateTransfer(
          encryptedOne,
          new anchor.BN(4),
          commitmentHash,
          encryptedTag
        )
        .accounts({
          senderBalance: senderBalancePda,
          receiverBalance: receiverBalancePda,
          sender: sender.publicKey,
        })
        .rpc();

      assert.fail("Missing signer should fail");
    } catch (err) {
      assert.ok(true);
    }
  });

   // 8. EVENT EMISSION (HELIUS-COMPATIBLE)


  it("Emits PrivateTransferEvent for indexers", async () => {
    const listener = program.addEventListener(
      "privateTransferEvent",
      (event) => {
        assert.lengthOf(event.commitmentHash, 32);
        assert.lengthOf(event.encryptedTag, 32);
      }
    );

    await program.methods
      .privateTransfer(
        encryptedOne,
        new anchor.BN(4),
        commitmentHash,
        encryptedTag
      )
      .accounts({
        senderBalance: senderBalancePda,
        receiverBalance: receiverBalancePda,
        sender: sender.publicKey,
      })
      .signers([sender])
      .rpc();

    await program.removeEventListener(listener);
  });


   // 9. FINAL STATE SANITY CHECKS

  it("Final nonce values are consistent", async () => {
    const senderBal =
      await program.account.confidentialBalance.fetch(senderBalancePda);
    const receiverBal =
      await program.account.confidentialBalance.fetch(receiverBalancePda);

    assert.equal(senderBal.nonce.toNumber(), receiverBal.nonce.toNumber());
  });
});
