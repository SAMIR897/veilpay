use anchor_lang::prelude::*;
use solana_keccak_hasher::hashv;

/// Hash owner pubkey into a fixed 32-byte commitment
pub fn hash_owner(owner: &Pubkey) -> [u8; 32] {
    hashv(&[owner.as_ref()]).to_bytes()
}
