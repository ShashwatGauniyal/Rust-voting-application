use anchor_lang::prelude::*;
use crate::state::*;
use anchor_spl::token::{Mint,Token,TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::errors::*;



#[derive(Accounts)]
pub struct InitializeTreausry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init,
        payer = authority,
        space = 8 + TreasuryConfig::INIT_SPACE,
        seeds = [b"treasury_config"],
        bump
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    #[account(
        init,
        payer= authority,
        mint::authority = mint_authority,
        mint::decimals = 6,
        seeds = [b"x_mint"],
        bump
    )]
    pub x_mint: Account<'info, Mint>,

    #[account(
        init,
        payer= authority,
        associated_token::mint = x_mint,
        associated_token::authority = authority,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + ProposalCounter::INIT_SPACE,
        seeds = [b"proposal_counter" ],
        bump
    )]
    pub proposal_counter_account: Account<'info, ProposalCounter>,

    /// CHECK: This is to receive a SOL token
    #[account(mut, seeds = [b"sol_vault"], bump)]
    pub sol_vault : AccountInfo<'info>,
    
    /// CHECK: This is going to be the mint authority of x
    #[account(seeds = [b"mint_authority"], bump)]
    pub mint_authority : AccountInfo<'info>,

    pub token_program: Program<'info,Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    
    #[account(
        seeds = [b"treasury_config"],
        bump,
        constraint = treasury_config_account.x_mint == x_mint.key(),
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    /// CHECK: This is to receive a SOL token
    #[account(mut, seeds = [b"sol_vault"], bump = treasury_config_account.bump)]
    pub sol_vault : AccountInfo<'info>,
    
    #[account(
        mut
    )]
    pub x_mint: Account<'info, Mint>,

    #[account(
        mut
    )]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == x_mint.key(),
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is going to be the mint authority of x
    #[account(seeds = [b"mint_authority"], bump)]
    pub mint_authority : AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
    
}

#[derive(Accounts)]
pub struct RegisterVoter<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Voter::INIT_SPACE,
        seeds = [b"voter" , authority.key().as_ref()],
        bump
    )]
    pub voter_account: Account<'info, Voter>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterProposal<'info> {

    #[account(mut)]
    pub authority : Signer<'info>,

    #[account(
        mut,
        seeds = [b"proposal_counter"],
        bump
    )]
    pub proposal_counter_account: Account<'info, ProposalCounter>,

    #[account(
        init,
        payer = authority,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal",proposal_counter_account.proposal_count.to_be_bytes().as_ref() ],
        bump
    )]
    pub proposal_account: Account<'info, Proposal>,

    
    pub x_mint: Account<'info, Mint>,

    #[account(mut , constraint = treasury_token_account.mint == x_mint.key())]    
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = proposal_token_account.owner == authority.key(),
        constraint = proposal_token_account.mint == x_mint.key(),
    )]
    pub proposal_token_account : Account<'info , TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}
    

#[derive(Accounts)]
#[instruction(proposal_id : u8)]
pub struct Vote<'info> {

    #[account(mut)]
    pub authority : Signer<'info>,

    #[account(
        mut,
        constraint = voter_account.proposal_voted == 0,
        seeds = [b"voter", authority.key().as_ref()],
        bump
    )]
    pub voter_account: Account<'info, Voter>,
    
    pub x_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = voter_token_account.owner == authority.key() @ VoteError::
        VoterTokenAccountOwnerMismatch,
        constraint = voter_token_account.mint == x_mint.key() @ VoteError::MintMismatch,
    )]
    pub voter_token_account : Account<'info , TokenAccount>,

    #[account(mut , constraint = treasury_token_account.mint == x_mint.key())]    
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"proposal",proposal_id.to_be_bytes().as_ref() ],
        bump,
    )]
    pub proposal_account: Account<'info, Proposal>,

    pub token_program: Program<'info, Token>,

}

#[derive(Accounts)]
#[instruction(proposal_id : u8)]
pub struct PickWinner<'info> {
    #[account(mut)]
    pub authority : Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Winner::INIT_SPACE,
        seeds = [b"winner"],
        bump,
    )]
    pub winner_account : Account<'info, Winner>,

    #[account(seeds = [b"proposal",proposal_id.to_be_bytes().as_ref()] ,
        bump,)]
    pub proposal_account : Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proposal_id : u8)]
pub struct CloseProposal<'info>{
    #[account(mut)]
    pub authority : Signer<'info>,

    #[account(
        mut,
        seeds = [b"proposal",proposal_id.to_be_bytes().as_ref()] ,
        bump,
        close = destination,
        constraint = proposal_account.authority == authority.key() @ VoteError::UnauhtorizedAccess,
    )]
    pub proposal_account : Account<'info, Proposal>,

    /// CHECK: This account is only used as a destination to receive the reclaimed lamports from the closed proposal.
    #[account(mut)]
    pub destination : AccountInfo<'info>,
    
}

#[derive(Accounts)]

pub struct CloseVoter<'info>{
    #[account(mut)]
    pub authority : Signer<'info>,

    #[account(
        mut,
        seeds = [b"voter", authority.key().as_ref()],
        bump,
        close = authority,
    )]
    pub voter_account : Account<'info, Voter>,

}
#[derive(Accounts)]
pub struct WithdrawlSol<'info>{
    #[account(
        seeds = [b"treasury_config"],
        bump,
        constraint = treasury_config_account.authority == authority.key() @ VoteError::UnauhtorizedAccess,
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    /// The SOL vault PDA
    /// CHECK: This is a PDA that holds SOL, validated by seeds 
    
    #[account(mut , seeds = [b"sol_vault"], bump = treasury_config_account.bump)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}