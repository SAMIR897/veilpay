use anchor_lang::prelude::*;

#[event]
pub struct PrivateTransferEvent {
    pub commitment_hash: [u8; 32],
    pub encrypted_tag: [u8; 32],
}