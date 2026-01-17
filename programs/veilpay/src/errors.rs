use anchor_lang::prelude::*;

#[error_code]
pub enum VeilPayError {

    #[msg("Unauthorized sender for this operation.")]
    UnauthorizedSender,

    #[msg("Insufficient balance for the transaction.")]
    InsufficientBalance,

    #[msg("Unauthorized access to the account.")]
    UnauthorizedAccess,

    #[msg("Transaction amount exceeds the limit.")]
    TransactionLimitExceeded,

    #[msg("Account not found.")]
    AccountNotFound,

    #[msg("Invalid transaction type.")]
    InvalidTransactionType,

    #[msg("Invalid nonce (reply detected).")]
    InvalidNonce,
}