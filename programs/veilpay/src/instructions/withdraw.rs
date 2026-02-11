use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::{helpers::*, crypto::*};
use anchor_lang::system_program;
use crate::errors::VeilPayError;

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
    
    // SECURITY: Enforce balance check
    // Extract decrypted balance from on-chain state
    let decrypted_balance = cspl_decrypt(&ctx.accounts.confidential_balance.encrypted_balance);
    
    // Check if user has enough funds in their private balance
    require!(
        decrypted_balance >= amount,
        VeilPayError::InsufficientBalance
    );

    if vault_balance.saturating_sub(amount) < rent {
        return Err(ProgramError::InsufficientFunds.into());
    }

    let bump = ctx.bumps.vault;
    let seeds = &[
        VAULT_SEED,
        &[bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.signer.to_account_info(),
        },
        signer_seeds,
    );
    system_program::transfer(cpi_context, amount)?;

    // 3. Update Encrypted Balance (Subtract)
    // Fix: Previously we were adding the encrypted amount, which caused the balance to increase on withdraw.
    // For MVP, we decrypt, subtract, and re-encrypt.
    let new_balance = decrypted_balance - amount;
    ctx.accounts.confidential_balance.encrypted_balance = encrypt_amount(new_balance);
        
    Ok(())
}
