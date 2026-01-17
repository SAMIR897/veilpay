use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::helpers::*;

#[derive(Accounts)]
pub struct InitBalance<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + ConfidentialBalance::LEN,
        seeds = [BALANCE_SEED, owner.key().as_ref()],
        bump
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitBalance>) -> Result<()> {
    let balance = &mut ctx.accounts.confidential_balance;
    balance.owner_commitment = hash_owner(ctx.accounts.owner.key);
    balance.encrypted_balance = [0u8; 64]; // Initialize with zero balance
    balance.nonce = 0;
    balance.bump = ctx.bumps.confidential_balance;
    Ok(())
}