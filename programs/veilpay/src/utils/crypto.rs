use anchor_lang::prelude::*;
use solana_keccak_hasher::hashv;
use crate::constants::*;

pub fn cspl_assert_ge(
    balance: &[u8; ENCRYPTED_VALUE_SIZE],
    amount: &[u8; ENCRYPTED_VALUE_SIZE],
) -> Result<()> {
    // MOCK: Extract u64 directly from first 8 bytes
    let balance_val = extract_encrypted_value(balance);
    let amount_val = extract_encrypted_value(amount);

    require!(
        balance_val >= amount_val,
        ErrorCode::InsufficientBalance
    );

    Ok(())
}

pub fn cspl_sub(
    balance: &[u8; ENCRYPTED_VALUE_SIZE],
    amount: &[u8; ENCRYPTED_VALUE_SIZE],
) -> Result<[u8; ENCRYPTED_VALUE_SIZE]> {
    let balance_val = extract_encrypted_value(balance);
    let amount_val = extract_encrypted_value(amount);

    // Perform subtraction
    let result_val = balance_val.checked_sub(amount_val).ok_or(ErrorCode::InsufficientBalance)?;

    // Re-encrypt (pack)
    Ok(encrypt_amount(result_val))
}

pub fn cspl_add(
    balance: &[u8; ENCRYPTED_VALUE_SIZE],
    amount: &[u8; ENCRYPTED_VALUE_SIZE],
) -> Result<[u8; ENCRYPTED_VALUE_SIZE]> {
    let balance_val = extract_encrypted_value(balance);
    let amount_val = extract_encrypted_value(amount);

    // Perform addition
    let result_val = balance_val.checked_add(amount_val).unwrap_or(u64::MAX);

    // Re-encrypt (pack)
    Ok(encrypt_amount(result_val))
}

pub fn encrypt_amount(amount: u64) -> [u8; ENCRYPTED_VALUE_SIZE] {
    let mut encrypted = [0u8; ENCRYPTED_VALUE_SIZE];
    let amount_bytes = amount.to_le_bytes();

    // Store amount in first 8 bytes
    encrypted[0..8].copy_from_slice(&amount_bytes);

    // Fill the rest with noise (hash of amount to look random)
    let noise_seed = hashv(&[&amount_bytes, b"noise"]);
    encrypted[8..40].copy_from_slice(&noise_seed.to_bytes());
    
    // Fill remaining bytes if needed (size depends on constants, assuming 64)
    // ELGAMAL_C1_SIZE + ELGAMAL_C2_SIZE usually 64
    // We just fill 8..40 for now, rest remains 0 or can be filled more if strictly needed.

    encrypted
}

fn extract_encrypted_value(encrypted: &[u8; ENCRYPTED_VALUE_SIZE]) -> u64 {
    let mut value_bytes = [0u8; 8];
    value_bytes.copy_from_slice(&encrypted[0..8]);
    u64::from_le_bytes(value_bytes)
}

pub fn generate_encrypted_tag(
    recipient_pubkey: &Pubkey,
    sender_secret: &[u8; 32],
) -> [u8; 32] {
    let recipient_bytes = recipient_pubkey.as_ref();
    let shared_seed = [recipient_bytes, sender_secret].concat();
    hashv(&[&shared_seed]).to_bytes()
}

pub fn generate_commitment_hash(
    encrypted_amount: &[u8; ENCRYPTED_VALUE_SIZE],
    sender_nonce: u64,
    recipient_pubkey: &Pubkey,
) -> [u8; 32] {
    let nonce_bytes = sender_nonce.to_le_bytes();
    let combined = [encrypted_amount.as_ref(), &nonce_bytes, recipient_pubkey.as_ref()].concat();
    hashv(&[&combined]).to_bytes()
}

pub fn verify_commitment_hash(
    commitment_hash: &[u8; 32],
    encrypted_amount: &[u8; ENCRYPTED_VALUE_SIZE],
    sender_nonce: u64,
    recipient_pubkey: &Pubkey,
) -> bool {
    let expected = generate_commitment_hash(encrypted_amount, sender_nonce, recipient_pubkey);
    commitment_hash == expected.as_ref()
}

pub fn verify_encrypted_tag(
    encrypted_tag: &[u8; 32],
    recipient_pubkey: &Pubkey,
    sender_secret: &[u8; 32],
) -> bool {
    let expected_tag = generate_encrypted_tag(recipient_pubkey, sender_secret);
    encrypted_tag == expected_tag.as_ref()
}

pub fn derive_stealth_address(
    recipient_pubkey: &Pubkey,
    sender_secret: &[u8; 32],
) -> [u8; 32] {
    let tag = generate_encrypted_tag(recipient_pubkey, sender_secret);
    hashv(&[recipient_pubkey.as_ref(), &tag]).to_bytes()
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient balance for this operation")]
    InsufficientBalance,
    #[msg("Invalid encryption format")]
    InvalidEncryption,
}
