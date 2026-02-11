use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::{helpers::*, crypto::*};
use crate::errors::VeilPayError;

#[derive(Accounts)]
pub struct CancelTransfer<'info> {
    #[account(
        mut,
        seeds = [BALANCE_SEED, sender.key().as_ref()],
        bump = sender_balance.bump
    )]
    pub sender_balance: Account<'info, ConfidentialBalance>,

    #[account(
        mut,
        close = sender,
        seeds = [
            PENDING_TRANSFER_SEED, 
            sender.key().as_ref(), // Matches sender
            pending_transfer.recipient.as_ref(), // We trust whatever recipient is in state
            // Again, need nonce or just verify sender.
            // Since sender is signer, and PDA stores sender, has_one=sender ensures only original sender can cancel.
        ],
        bump = pending_transfer.bump,
        has_one = sender
    )]
    pub pending_transfer: Account<'info, PendingTransfer>,

    #[account(mut)]
    pub sender: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelTransfer>) -> Result<()> {
    let sender_balance = &mut ctx.accounts.sender_balance;
    let pending_transfer = &ctx.accounts.pending_transfer;

    // 1. Decrypt current balance
    let current_balance = cspl_decrypt(&sender_balance.encrypted_balance);

    // 2. Add refunded amount
    let new_balance = current_balance + pending_transfer.amount;

    // 3. Update encrypted balance
    sender_balance.encrypted_balance = encrypt_amount(new_balance);

    Ok(())
}
