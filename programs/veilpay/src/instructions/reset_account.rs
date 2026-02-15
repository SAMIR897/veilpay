use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::{crypto::*};

#[derive(Accounts)]
pub struct ResetAccount<'info> {
    #[account(
        mut,
        seeds = [BALANCE_SEED, signer.key().as_ref()],
        bump = confidential_balance.bump
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
}

pub fn handler(ctx: Context<ResetAccount>) -> Result<()> {
    // 1. Reset Balance to 0
    ctx.accounts.confidential_balance.encrypted_balance = encrypt_amount(0);
    
    // 2. Reset Nonce (Optional, but good for clean slate)
    ctx.accounts.confidential_balance.nonce = 0;
    
    msg!("Account state reset successfully.");
    Ok(())
}
