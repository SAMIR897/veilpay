use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;
use crate::errors::*;
use crate::utils::{helpers::*, crypto::*};

#[derive(Accounts)]
pub struct PrivateTransfer<'info> {

    #[account(mut)]
    pub sender_balance: Account<'info, ConfidentialBalance>,

    #[account(mut)]
    pub receiver_balance: Account<'info, ConfidentialBalance>,
    pub sender: Signer<'info>,
}

pub fn handler(
    ctx: Context<PrivateTransfer>,
    encrypted_amount: [u8; 64],
    expected_nonce: u64,
    commitment_hash: [u8; 32],
    encrypted_tag: [u8; 32],
) -> Result<()> {
    let sender_key = ctx.accounts.sender.key();

    // Verify commitment hash
    require!(
        ctx.accounts.sender_balance.owner_commitment == hash_owner(&sender_key),
        VeilPayError::UnauthorizedAccess
    );

    // Verify nonce
    require!(
        ctx.accounts.sender_balance.nonce == expected_nonce,
        VeilPayError::InvalidNonce
    );

    // Perform confidential Balance check
    cspl_asser_ge(
        &ctx.accounts.sender_balance.encrypted_balance,
        &encrypted_amount,
    )?;

    // Confidentially arithmetic operations (Arcium)
    ctx.accounts.sender_balance.encrypted_balance = 
        cspl_sub(
            &ctx.accounts.sender_balance.encrypted_balance,
            &encrypted_amount,
        )?;

    ctx.accounts.receiver_balance.encrypted_balance = 
        cspl_add(
            &ctx.accounts.receiver_balance.encrypted_balance,
            &encrypted_amount,
        )?;
        
    ctx.accounts.sender_balance.nonce += 1;    
    ctx.accounts.receiver_balance.nonce += 1;

    emit!(PrivateTransferEvent {
        commitment_hash,
        encrypted_tag,
    });
    Ok(())
}