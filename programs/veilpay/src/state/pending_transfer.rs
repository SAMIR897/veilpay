use anchor_lang::prelude::*;
use crate::constants::ENCRYPTED_VALUE_SIZE;

#[account]
pub struct PendingTransfer {
    pub sender: Pubkey,              // 32
    pub recipient: Pubkey,           // 32
    pub amount: u64,                 // 8
    pub encrypted_amount: [u8; ENCRYPTED_VALUE_SIZE], // 64
    pub timestamp: i64,              // 8
    pub bump: u8,                    // 1
}

impl PendingTransfer {
    pub const LEN: usize = 8 + // discriminator
        32 + // sender
        32 + // recipient
        8 + // amount
        ENCRYPTED_VALUE_SIZE + // encrypted_amount
        8 + // timestamp
        1; // bump
}
