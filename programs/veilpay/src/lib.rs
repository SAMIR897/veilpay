use anchor_lang::prelude::*;

pub mod constants;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;
pub mod errors;

declare_id!("6pYu5mRNehST4KkwUzcEKt47Km9qNAvmCtdRtTjEanDG");

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
}
