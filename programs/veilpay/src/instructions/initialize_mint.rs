use anchor_lang::prelude::*;
use crate::state::VeilPayMint;

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + VeilPayMint::LEN,
    )]
    pub veilpay_mint: Account<'info, VeilPayMint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeMint>, cspl_config: [u8; 64]) -> Result<()> {
    let mint = &mut ctx.accounts.veilpay_mint;
    mint.authority = ctx.accounts.authority.key();
    mint.cspl_config = cspl_config;
    mint.bump = 0; // No PDA seeds used, so bump is not applicable
    Ok(())
}