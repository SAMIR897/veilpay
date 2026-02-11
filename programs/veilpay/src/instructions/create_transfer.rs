use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::utils::{helpers::*, crypto::*};
use crate::errors::VeilPayError;

#[derive(Accounts)]
#[instruction(amount: u64, encrypted_amount: [u8; 64], recipient: Pubkey)]
pub struct CreateTransfer<'info> {
    #[account(
        mut,
        seeds = [BALANCE_SEED, sender.key().as_ref()],
        bump = sender_balance.bump
    )]
    pub sender_balance: Account<'info, ConfidentialBalance>,

    #[account(
        init,
        payer = sender,
        space = 8 + PendingTransfer::LEN,
        seeds = [
            PENDING_TRANSFER_SEED, 
            sender.key().as_ref(), 
            recipient.as_ref(), 
            &sender_balance.nonce.to_le_bytes() // Unique for each transfer
        ],
        bump
    )]
    pub pending_transfer: Account<'info, PendingTransfer>,

    #[account(mut)]
    pub sender: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateTransfer>,
    amount: u64,
    encrypted_amount: [u8; 64],
    recipient: Pubkey,
) -> Result<()> {
    let sender_balance = &mut ctx.accounts.sender_balance;

    // 1. Verify Sender has enough funds
    let decrypted_balance = cspl_decrypt(&sender_balance.encrypted_balance);
    require!(
        decrypted_balance >= amount,
        VeilPayError::InsufficientBalance
    );

    // 2. Encrypt the amount we are subtracting (simplification for MVP: actually we should use homomorphic subtract)
    // But since we have the plain amount, we can just subtract the plain amount and re-encrypt the new total.
    // This removes drift and is cleaner for the MVP.
    let new_balance = decrypted_balance - amount;
    sender_balance.encrypted_balance = encrypt_amount(new_balance);

    // 3. Increment nonce to ensure unique PDA for next transfer
    sender_balance.nonce += 1;

    // 4. Initialize Pending Transfer
    let pending_transfer = &mut ctx.accounts.pending_transfer;
    pending_transfer.sender = ctx.accounts.sender.key();
    pending_transfer.recipient = recipient;
    pending_transfer.amount = amount;
    pending_transfer.encrypted_amount = encrypted_amount; // This is the encrypted value FOR THE RECEIVER
    pending_transfer.timestamp = Clock::get()?.unix_timestamp;
    pending_transfer.bump = ctx.bumps.pending_transfer;

    Ok(())
}
