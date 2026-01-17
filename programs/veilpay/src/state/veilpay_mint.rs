use anchor_lang::prelude::*;

#[account]
pub struct VeilPayMint {
    pub authority : Pubkey,
    pub cspl_config: [u8; 64], // Arcium confidential params
    pub bump: u8,
}

impl VeilPayMint {
    pub const LEN: usize = 32 + 64 + 1; // Pubkey + cspl_config + bump
}