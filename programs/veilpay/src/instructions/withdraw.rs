use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::{helpers::*, crypto::*};
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [BALANCE_SEED, signer.key().as_ref()],
        bump = confidential_balance.bump
    )]
    pub confidential_balance: Account<'info, ConfidentialBalance>,
    
    /// CHECK: Safe because it's just a vault for SOL
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump
    )]
    pub vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Withdraw>,
    amount: u64,
    encrypted_amount: [u8; 64], // This should be Encrypted(-amount)
) -> Result<()> {
    // 1. ZK Proof Check (Missing in MVP)
    // require!(verify_balance(encrypted_balance, amount), VeilPayError::InsufficientFunds);
    
    // 2. Transfer SOL from Vault to User
    let rent = Rent::get()?.minimum_balance(0);
    let vault_balance = ctx.accounts.vault.lamports();
    
    if vault_balance.saturating_sub(amount) < rent {
        return Err(ProgramError::InsufficientFunds.into());
    }

    **ctx.accounts.vault.try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.signer.try_borrow_mut_lamports()? += amount;

    // 3. Update Encrypted Balance (Add negative amount = Subtract)
    ctx.accounts.confidential_balance.encrypted_balance = 
        cspl_add(
            &ctx.accounts.confidential_balance.encrypted_balance,
            &encrypted_amount,
        )?;
        
    Ok(())
}
