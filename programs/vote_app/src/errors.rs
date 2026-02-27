use anchor_lang::prelude::*;

#[error_code]
pub enum VoteError{
    #[msg("Invalid Deadline")]
    InvalidDeadline,

    #[msg("Proposal Counter is already initialized")]
    ProposalCounterAlreadyInitialized,

    #[msg("Proposal Counter overflow")]
    ProposalCounterOverflow,
    
    #[msg("Proposal Votes overflow")]
    ProposalVotesOverflow,

    #[msg("Proposal Time has ended")]
    ProposalEnded,

    #[msg("Voting is still active for this proposal")]
    VotingStillActive,

    #[msg("No votes have been cast for this proposal")]
    NoVotesCast,

    #[msg("Unauthorized Access
    ")]
    UnauhtorizedAccess,
    #[msg("Mint mismatch")]
    MintMismatch,

    #[msg("Voter token account owner mismatch")]
    VoterTokenAccountOwnerMismatch,
    
    
    
}
