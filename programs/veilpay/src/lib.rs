use anchor_lang::prelude::*;

pub mod constants;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;
pub mod errors;

declare_id!("5vKU63aqbKn5F4NWMnaMoq1jjSVSR8DNCFbfJnc4fPUZ");

use instructions::*;

#[program]
pub mod veilpay {
    use super::*;

    pub fn initialize_mint(
        ctx: Context<InitializeMint>,
        cspl_config: [u8; 64],
    ) -> Result<()> {
        instructions::initialize_mint::handler(ctx, cspl_config)
    }

    pub fn init_balance(
        ctx: Context<InitBalance>,
    ) -> Result<()> {
        instructions::init_balance::handler(ctx)
    }

    pub fn private_transfer(
        ctx: Context<PrivateTransfer>,
        encrypted_amount: [u8; 64],
        expected_nonce: u64,
        commitment_hash: [u8; 32],
        encrypted_tag: [u8; 32],
    ) -> Result<()> {
        instructions::private_transfer::handler(
            ctx,
            encrypted_amount,
            expected_nonce,
            commitment_hash,
            encrypted_tag,
        )
    }

    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
        encrypted_amount: [u8; 64],
    ) -> Result<()> {
        instructions::deposit::handler(ctx, amount, encrypted_amount)
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
        encrypted_amount: [u8; 64],
    ) -> Result<()> {
        instructions::withdraw::handler(ctx, amount, encrypted_amount)
    }

    pub fn create_transfer(
        ctx: Context<CreateTransfer>,
        amount: u64,
        encrypted_amount: [u8; 64],
        recipient: Pubkey,
    ) -> Result<()> {
        instructions::create_transfer::handler(ctx, amount, encrypted_amount, recipient)
    }

    pub fn claim_transfer(
        ctx: Context<ClaimTransfer>,
    ) -> Result<()> {
        instructions::claim_transfer::handler(ctx)
    }

    pub fn cancel_transfer(
        ctx: Context<CancelTransfer>,
    ) -> Result<()> {
        instructions::cancel_transfer::handler(ctx)
    }
}
