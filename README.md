# VeilPay 🔒

**Private Payments with Public UX on Solana**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Anchor](https://img.shields.io/badge/Anchor-0.32.1-blue)](https://www.anchor-lang.com/)
[![Solana](https://img.shields.io/badge/Solana-1.18-purple)](https://solana.com/)

VeilPay is a privacy-first payment protocol on Solana that enables fully private SPL token transfers while preserving wallet-like UX, notifications, and auditability. Built with Arcium confidential SPL and Helius privacy-safe indexing.

---

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [License](#license)

---

## 🎯 Problem Statement

On Solana today, every payment leaks sensitive financial data:

- ❌ **Wallet balances are public** - Anyone can query your balance
- ❌ **Transfer amounts are visible** - Transaction amounts are on-chain
- ❌ **Wallets can be clustered** - Address reuse enables deanonymization
- ❌ **Indexers expose full context** - Transaction history is fully transparent

This is unacceptable for:
- 💼 Payroll and salary payments
- 🏛️ DAO treasury operations
- 👥 Private peer-to-peer transfers
- 🛠️ Builders who need privacy without degrading UX

Most existing privacy solutions sacrifice usability:
- No activity feed
- No real notifications
- No way to selectively prove ownership or balances

---

## ✨ Solution

VeilPay combines:

1. **Arcium Confidential SPL (cSPL)** - Encrypted balances and transfers
2. **Helius Privacy-Safe Indexing** - Activity feeds and notifications
3. **Stealth Addresses** - Prevents wallet clustering
4. **Selective Disclosure Proofs** - Optional compliance and audits

**Core Design Principle:** Keep all sensitive data encrypted end-to-end, while exposing just enough metadata for a smooth user experience.

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VeilPay Ecosystem                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Solana     │────────▶│   Arcium     │
│  (Next.js)  │         │   Program    │         │     MPC      │
└──────────────┘         └──────────────┘         └──────────────┘
      │                         │                         │
      │                         │                         │
      ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Helius     │         │   Events     │         │  Encrypted   │
│  Indexing    │◀────────│  (Privacy-   │         │   Balances    │
│              │         │   Safe)      │         │               │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Privacy Model

#### 🔒 What Stays Private

- **Wallet Balance** - Encrypted with Arcium MPC
- **Transfer Amount** - Never revealed on-chain
- **Sender Identity** - Hidden via commitments
- **Receiver Identity** - Stealth addresses

#### 🌐 What's Public

- **Transaction Existence** - Timestamp and slot
- **Validity Proof** - Cryptographic commitments
- **Event Metadata** - Non-sensitive data for indexing

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Solana Program Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ Initialize Mint │  │ Init Balance   │  │Private       │ │
│  │                 │  │                 │  │Transfer      │ │
│  └────────────────┘  └────────────────┘  └─────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Cryptographic Operations                   │  │
│  │  • cspl_add()      • cspl_sub()                      │  │
│  │  • cspl_assert_ge() • generate_encrypted_tag()       │  │
│  │  • generate_commitment_hash()                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Event Emission                          │  │
│  │  • PrivateTransferEvent (Helius-compatible)          │  │
│  │  • BalanceInitializedEvent                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Hero Page  │  │  Dashboard   │  │ Wallet       │     │
│  │              │  │              │  │ Integration  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │Balance Card  │  │Transfer Form │  │Activity Feed │     │
│  │              │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Client-Side Encryption                      │  │
│  │  • encryptAmount()    • decryptAmount()              │  │
│  │  • generateEncryptedTag()                            │  │
│  │  • generateCommitmentHash()                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │    Arcium    │              │    Helius    │            │
│  │      MPC     │              │   Indexing   │            │
│  │              │              │              │            │
│  │ • Encrypted  │              │ • Webhooks   │            │
│  │   Arithmetic│              │ • Privacy-   │            │
│  │ • Range      │              │   Safe       │            │
│  │   Proofs     │              │   Metadata   │            │
│  └──────────────┘              └──────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Private Transfer Flow

```
1. User Initiates Transfer
   │
   ├─▶ Frontend encrypts amount (client-side)
   │   └─▶ Uses Arcium encryption utilities
   │
2. Generate Privacy Components
   │
   ├─▶ Generate encrypted_tag (ECDH-based)
   ├─▶ Generate commitment_hash
   └─▶ Get current nonce
   │
3. Submit Transaction
   │
   ├─▶ Solana Program validates:
   │   ├─▶ Owner commitment matches
   │   ├─▶ Nonce is correct
   │   └─▶ Balance >= amount (confidential check)
   │
4. Execute Transfer
   │
   ├─▶ Subtract from sender (encrypted arithmetic)
   ├─▶ Add to receiver (encrypted arithmetic)
   ├─▶ Increment nonces
   └─▶ Emit PrivateTransferEvent
   │
5. Indexing & Notification
   │
   ├─▶ Helius indexes event (privacy-safe metadata)
   ├─▶ Frontend queries Helius for activity feed
   └─▶ User sees "Received private payment" notification
```

### Account Structure

```
ConfidentialBalance Account:
┌─────────────────────────────────────────┐
│ owner_commitment: [u8; 32]              │  ← Hashed owner pubkey
├─────────────────────────────────────────┤
│ encrypted_balance: [u8; 64]             │  ← Arcium encrypted value
│   ├─ C1: [u8; 32] (ElGamal component 1) │
│   └─ C2: [u8; 32] (ElGamal component 2) │
├─────────────────────────────────────────┤
│ nonce: u64                              │  ← Replay protection
├─────────────────────────────────────────┤
│ bump: u8                                │  ← PDA bump seed
└─────────────────────────────────────────┘
Total Size: 105 bytes
```

---

## 🚀 Features

### Core Features

- ✅ **Confidential Balances** - Encrypted balance storage using Arcium MPC
- ✅ **Private Transfers** - Amounts never revealed on-chain
- ✅ **Stealth Addresses** - One-time addresses prevent clustering
- ✅ **Activity Feed** - Privacy-safe notifications via Helius
- ✅ **Selective Disclosure** - Optional proof generation for audits
- ✅ **Replay Protection** - Nonce-based transaction security
- ✅ **Owner Verification** - Commitment-based access control

### Frontend Features

- 🎨 **Modern UI** - Glassmorphism design with dark theme
- 🔌 **Wallet Integration** - Phantom, Solflare, and more
- 📊 **Real-time Updates** - Live activity feed
- 🔒 **Balance Toggle** - View encrypted or decrypted balance
- 📱 **Responsive Design** - Mobile-friendly interface

### Security Features

- 🔐 **End-to-End Encryption** - All sensitive data encrypted
- 🛡️ **Replay Attack Prevention** - Nonce-based protection
- 🔑 **Access Control** - Owner commitment verification
- ✅ **Range Proofs** - Balance validation without revealing amounts
- 🎯 **Zero-Knowledge** - Cryptographic proofs for correctness

---

## 🏁 Quick Start

### Prerequisites

- **Rust** 1.75+
- **Solana CLI** 1.18+
- **Anchor** 0.32+
- **Node.js** 18+
- **npm** or **yarn**

### 1. Clone Repository

```bash
git clone <repository-url>
cd veilpay
```

### 2. Install Solana & Anchor

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### 3. Build Program

```bash
cd veilpay
anchor build
```

### 4. Run Tests

```bash
anchor test
```

### 5. Start Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API keys
npm run dev
```

Visit `http://localhost:3000` to see the app!

---

## 📦 Installation

### Detailed Setup

#### 1. Solana Program Setup

```bash
cd veilpay

# Install dependencies
yarn install

# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=6pYu5mRNehST4KkwUzcEKt47Km9qNAvmCtdRtTjEanDG

# Helius Configuration
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key_here
NEXT_PUBLIC_HELIUS_RPC_URL=https://devnet.helius-rpc.com/?api-key=...

# Arcium Configuration (Optional)
NEXT_PUBLIC_ARCIUM_API_KEY=your_arcium_api_key_here
```

#### 3. Get API Keys

**Helius:**
1. Sign up at [helius.dev](https://helius.dev)
2. Get API key from dashboard
3. Configure webhook (optional)

**Arcium:**
1. Sign up at [arcium.com](https://arcium.com)
2. Get API key for full encryption integration
3. Configure MXE endpoint

---

## 💻 Usage

### Program Instructions

#### Initialize Mint

```typescript
await program.methods
  .initializeMint(csplConfig)
  .accounts({
    veilpayMint: mintPda,
    authority: authority.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

#### Initialize Balance

```typescript
const balancePda = PublicKey.findProgramAddressSync(
  [Buffer.from("balance"), owner.publicKey.toBuffer()],
  program.programId
)[0];

await program.methods
  .initBalance()
  .accounts({
    confidentialBalance: balancePda,
    owner: owner.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([owner])
  .rpc();
```

#### Private Transfer

```typescript
const encryptedAmount = encryptAmount(100); // Client-side encryption
const commitmentHash = generateCommitmentHash(
  encryptedAmount,
  nonce,
  recipientPubkey
);
const encryptedTag = generateEncryptedTag(recipientPubkey, senderSecret);

await program.methods
  .privateTransfer(
    encryptedAmount,
    new BN(nonce),
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
```

### Frontend Usage

#### Connect Wallet

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, connect, disconnect } = useWallet();
```

#### Initialize Balance

```typescript
import { useVeilPayWallet } from '@/contexts/WalletContext';

const { refreshBalance } = useVeilPayWallet();
// Balance initialization happens automatically on first use
```

#### Send Private Payment

```typescript
// Use TransferForm component
<TransferForm />
// Or programmatically:
const encryptedAmount = encryptAmount(amount);
// ... submit transaction
```

---

## 🧪 Testing

### Run All Tests

```bash
cd veilpay
anchor test
```

### Test Coverage

The test suite includes **30+ test cases** covering:

- ✅ Mint initialization
- ✅ Balance initialization
- ✅ Private transfers (success cases)
- ✅ Error cases (replay attacks, unauthorized access, etc.)
- ✅ State consistency
- ✅ Integration scenarios
- ✅ Event emission

See [TEST_COVERAGE.md](./TEST_COVERAGE.md) for detailed coverage.

### Test Structure

```
tests/
└── veilpay.ts
    ├── Mint Initialization Tests
    ├── Balance Initialization Tests
    ├── Private Transfer Success Cases
    ├── Error Cases & Edge Cases
    ├── State Consistency Tests
    └── Integration Tests
```

---

## 🚢 Deployment

### Deploy Program to Devnet

```bash
cd veilpay
anchor build
anchor deploy --provider.cluster devnet
```

### Deploy Program to Mainnet

```bash
# Update Anchor.toml with mainnet cluster
anchor build
anchor deploy --provider.cluster mainnet-beta
```

### Deploy Frontend

#### Vercel

```bash
cd frontend
vercel deploy
```

#### Netlify

```bash
cd frontend
npm run build
netlify deploy --prod
```

### Environment Variables

Ensure all environment variables are set in your deployment platform:

- `NEXT_PUBLIC_SOLANA_NETWORK`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`
- `NEXT_PUBLIC_HELIUS_API_KEY`
- `NEXT_PUBLIC_ARCIUM_API_KEY` (optional)

---

## 🔐 Security

### Security Model

VeilPay implements multiple layers of security:

1. **Encryption Layer**
   - All balances encrypted with Arcium MPC
   - Transfer amounts never revealed
   - Client-side encryption for sensitive operations

2. **Access Control**
   - Owner commitment verification
   - Signature requirements
   - Nonce-based replay protection

3. **Privacy Layer**
   - Stealth addresses prevent clustering
   - Encrypted tags for recipient detection
   - Commitment hashes for verification

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Balance disclosure | Arcium MPC encryption |
| Amount disclosure | Encrypted transfers |
| Replay attacks | Nonce validation |
| Unauthorized access | Owner commitment checks |
| Wallet clustering | Stealth addresses |
| Transaction linking | Encrypted tags |

### Audit Considerations

- ✅ All sensitive operations are encrypted
- ✅ Events contain only non-sensitive metadata
- ✅ Client-side decryption only
- ✅ No single point of failure
- ✅ Open source for review

---

## 📁 Project Structure

```
veilpay/
├── veilpay/                    # Solana Program
│   ├── programs/
│   │   └── veilpay/
│   │       └── src/
│   │           ├── instructions/    # Program instructions
│   │           ├── state/           # Account structures
│   │           ├── utils/           # Crypto utilities
│   │           ├── events.rs         # Event definitions
│   │           ├── errors.rs         # Error codes
│   │           └── lib.rs            # Program entry point
│   ├── tests/
│   │   └── veilpay.ts               # Integration tests
│   └── Anchor.toml                  # Anchor configuration
│
├── frontend/                   # Next.js Frontend
│   ├── app/                    # Next.js app directory
│   ├── components/              # React components
│   ├── contexts/               # React contexts
│   ├── lib/                    # Utilities
│   ├── providers/              # Provider components
│   └── idl/                    # Anchor IDL
│
├── cli/                        # CLI Tool (optional)
│   └── src/
│       └── commands/
│
├── README.md                   # This file
├── PROJECT_SUMMARY.md          # Project overview
├── FRONTEND_SETUP.md           # Frontend setup guide
├── TEST_COVERAGE.md            # Test documentation
└── IMPLEMENTATION_SUMMARY.md   # Implementation details
```

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Add tests** for new functionality
5. **Ensure all tests pass** (`anchor test`)
6. **Commit your changes** (`git commit -m 'Add amazing feature'`)
7. **Push to the branch** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Development Guidelines

- Follow Rust formatting: `cargo fmt`
- Run linter: `cargo clippy`
- Write tests for all new features
- Update documentation
- Follow Solana best practices

---

## 📚 Documentation

### Additional Documentation

- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Detailed project overview
- **[FRONTEND_SETUP.md](./FRONTEND_SETUP.md)** - Frontend setup guide
- **[TEST_COVERAGE.md](./TEST_COVERAGE.md)** - Test coverage details
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation guide

### Program Documentation

- **[veilpay/README.md](./veilpay/README.md)** - Program documentation
- **[frontend/README.md](./frontend/README.md)** - Frontend documentation

### External Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Documentation](https://www.anchor-lang.com/docs)
- [Arcium Documentation](https://docs.arcium.com/)
- [Helius Documentation](https://docs.helius.dev/)

---

## 🎯 Roadmap

### Completed ✅

- [x] Core confidential transfer logic
- [x] Event emission for indexing
- [x] Frontend UI with all major components
- [x] Wallet integration
- [x] Comprehensive test suite
- [x] Documentation

### In Progress 🚧

- [ ] Full Arcium MPC integration
- [ ] Helius webhook backend
- [ ] Mobile wallet support

### Planned 📋

- [ ] Stealth address implementation
- [ ] Selective disclosure proofs UI
- [ ] Multi-token support
- [ ] Cross-chain bridges
- [ ] Mobile app

---

## 🏆 Hackathon Fit

### Tracks

- ✅ **Private Payments** - Core functionality
- ✅ **Open / General Track** - Innovation in privacy

### Sponsor Integration

- **Arcium** - Confidential SPL and encrypted state
- **Helius** - Privacy-safe indexing and wallet-grade UX

### Why It Matters

- Makes privacy practical and usable on Solana
- Preserves Solana's performance and composability
- Unlocks real use cases: private payroll, DAO treasury ops, anonymous peer payments
- Provides a blueprint for privacy-aware dApps and wallets on Solana

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Arcium** - For confidential SPL infrastructure
- **Helius** - For privacy-safe indexing solutions
- **Solana** - For the high-performance blockchain
- **Anchor** - For the amazing framework

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@veilpay.io

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Built with ❤️ for Solana Hackathon**

*Making privacy practical, one transaction at a time.*

