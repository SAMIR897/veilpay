use anchor_lang::prelude::*;

#[account]
pub struct ConfidentialBalance {
    pub owner_commitment: [u8; 32], // hashed owner pubkey
    pub encrypted_balance: [u8; 64], // Arcium encrypted value
    pub nonce: u64,
    pub bump: u8,
}

impl ConfidentialBalance {
    pub const LEN: usize = 32 + 64 + 8 + 1; // owner_commitment + encrypted_balance + nonce + bump
}