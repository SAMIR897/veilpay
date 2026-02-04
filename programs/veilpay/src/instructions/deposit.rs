use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::{helpers::*, crypto::*};
use anchor_lang::system_program;

#[derive(Accounts)]
pub struct Deposit<'info> {
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
    ctx: Context<Deposit>,
    amount: u64,
    encrypted_amount: [u8; 64],
) -> Result<()> {
    // 1. Verify that encrypted_amount corresponds to amount (In real Arcium usage, this needs ZK proof)
    // For MVP/Hackathon: We TRUST the user that encrypted_amount == amount.
    // Ideally: verify_encryption(amount, encrypted_amount, pubkey)
    
    // 2. Transfer SOL from user to Vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.signer.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, amount)?;

    // 3. Update Encrypted Balance (Add)
    ctx.accounts.confidential_balance.encrypted_balance = 
        cspl_add(
            &ctx.accounts.confidential_balance.encrypted_balance,
            &encrypted_amount,
        )?;
        
    Ok(())
}
