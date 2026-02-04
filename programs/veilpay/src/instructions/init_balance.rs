use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::helpers::*;

#[derive(Accounts)]
pub struct InitBalance<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ConfidentialBalance::LEN,
        seeds = [BALANCE_SEED, owner.key().as_ref()],
        bump
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    /// CHECK: Safe because we only use the key for seeds/commitment
    pub owner: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitBalance>) -> Result<()> {
    let balance = &mut ctx.accounts.confidential_balance;
    balance.owner_commitment = hash_owner(ctx.accounts.owner.key);
    balance.encrypted_balance = [0u8; 64]; // Initialize with zero balance
    balance.nonce = 0;
    balance.bump = ctx.bumps.confidential_balance;
    
    // Emit event for Helius indexing
    let clock = Clock::get()?;
    emit!(crate::events::BalanceInitializedEvent {
        owner_commitment: balance.owner_commitment,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}