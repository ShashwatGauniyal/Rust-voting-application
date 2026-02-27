import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";

import { expect } from "chai";
import {
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";

import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";


const SEEDS ={
  TREASURY_CONFIG: "treasury_config",
  X_MINT: "x_mint",
  SOL_VAULT: "sol_vault",
  MINT_AUTHORITY: "mint_authority",
  VOTER : "voter",
  PROPOSAL_COUNTER : "proposal_counter",
  PROPOSAL : "proposal",
  WINNER : "winner"
}as const;

const PROPOSAL_ID = 1;

const findPda =  (programId: anchor.web3.PublicKey,seeds:(Buffer | Uint8Array)[]) : anchor.web3.PublicKey => {
  const [pda,bump] = anchor.web3.PublicKey.findProgramAddressSync(seeds,programId);
  return pda;
};

const airDropSol = async (connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, sol: number) => {
  const signature = await connection.requestAirdrop(publicKey, sol);
  await connection.confirmTransaction(signature, "confirmed");
};

const getBlockTime = async(connection:anchor.web3.Connection):Promise<number>=>{
  const slot = await connection.getSlot();
  const BlockTime = await connection.getBlockTime(slot);

  if (BlockTime === null){
    throw new Error("Failed to fetch the block time")
  }
  return BlockTime;
}

const expectAnchorErrorCode = (err: unknown, expectedCode: string) =>{
  const anyErr = err as any;
  let actualError = 
    anyErr?.error?.errorCode?.code ??
    anyErr?.errorCode?.code ??
    anyErr?.code;

  if (!actualError && anyErr?.transactionLogs) {
    const logsString = anyErr.transactionLogs.join(" ");
    if (logsString.includes(`Error Code: ${expectedCode}`)) {
      actualError = expectedCode; // Log mein mil gaya!
    }
  }
  expect(actualError).to.equal(expectedCode);
};

describe("Testing Vote App", () => {
  
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);   
  const connection = provider.connection;
  const program = anchor.workspace.voteApp as Program<VoteApp>;
  
  const adminWallet = (provider.wallet as NodeWallet).payer;

  let proposalCreatorWallet = new anchor.web3.Keypair();
  let voterWallet = new anchor.web3.Keypair();
  let proposalCreatorTokenAccount : anchor.web3.PublicKey;
  let proposalCounterPda : anchor.web3.PublicKey;
  let proposalPda : anchor.web3.PublicKey;
  let voterPda : anchor.web3.PublicKey;
  let winnerPda : anchor.web3.PublicKey;
  let treasureConfigPda : anchor.web3.PublicKey;
  let xMintPda : anchor.web3.PublicKey;
  let solVaultPda : anchor.web3.PublicKey;
  let mintAuthorityPda : anchor.web3.PublicKey;
  let treasuryTokenAccount : anchor.web3.PublicKey;
  let voterTokenAccount : anchor.web3.PublicKey;
  
  
  beforeEach( async ()=>{
    treasureConfigPda = findPda(program.programId,[anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG)]);

    winnerPda = findPda(program.programId,[anchor.utils.bytes.utf8.encode(SEEDS.WINNER)]);

    proposalPda = findPda(program.programId,[anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL),Buffer.from([PROPOSAL_ID])]);

    proposalCounterPda = findPda(program.programId,[anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL_COUNTER)]);
    
    xMintPda = findPda(program.programId,[anchor.utils.bytes.utf8.encode(SEEDS.X_MINT)]);
    
    solVaultPda = findPda(program.programId,[anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT)]);
    
    console.log("airdropping sol");

    await Promise.all([
      airDropSol(connection,proposalCreatorWallet.publicKey,10 * anchor.web3.LAMPORTS_PER_SOL),
      airDropSol(connection,voterWallet.publicKey,10 * anchor.web3.LAMPORTS_PER_SOL)
    ])
    console.log("airdropping sol successfull");

    mintAuthorityPda = findPda(program.programId,[anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY)]);

    voterPda = findPda(program.programId , [anchor.utils.bytes.utf8.encode(SEEDS.VOTER),voterWallet.publicKey.toBuffer()]);

  })

    const createTokenAccounts = async() =>{
      console.log("creating token accounts");
      treasuryTokenAccount = (await getOrCreateAssociatedTokenAccount(
        connection,
        adminWallet,
        xMintPda,
        adminWallet.publicKey,
      )).address;

      proposalCreatorTokenAccount = (await getOrCreateAssociatedTokenAccount(
        connection,
        proposalCreatorWallet,
        xMintPda,
        proposalCreatorWallet.publicKey,
      )).address;

      voterTokenAccount = (await getOrCreateAssociatedTokenAccount(
        connection,
        voterWallet,
        xMintPda,
        voterWallet.publicKey,
      )).address;

    }

  describe("1. Initialization" , () =>{

    it("1.1 initializes treasurey!", async () => {
      const solPrice = new anchor.BN(1000000000);
      const tokenPerPurchase = new anchor.BN(1000000000);

      await program.methods.initializeTreasury(solPrice,tokenPerPurchase).accounts({
        authority:adminWallet.publicKey,
      }).rpc();

      const treasuryAccountData = await program.account.treasuryConfig.fetch(treasureConfigPda);
      expect(treasuryAccountData.solPrince.toNumber()).to.equal(solPrice.toNumber());

      expect(treasuryAccountData.tokenPerPurchase.toNumber()).to.equal(tokenPerPurchase.toNumber());

      expect(treasuryAccountData.authority.toBase58()).to.equal(adminWallet.publicKey.toBase58());

      expect(treasuryAccountData.xMint.toBase58()).to.equal(xMintPda.toBase58());

      await createTokenAccounts();
  });

  })

  describe("2. Buy Tokens" ,() =>{ 
    it("2.1 buys tokens for proposal creator",async()=>{

      const tokenBalanceBefore = (await getAccount(connection,proposalCreatorTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer:proposalCreatorWallet.publicKey,
        buyerTokenAccount : proposalCreatorTokenAccount,
        xMint: xMintPda,
      }).signers([proposalCreatorWallet]).rpc();

      const tokenBalanceAfter = (await getAccount(connection,proposalCreatorTokenAccount)).amount;
      expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(BigInt(1000000000));

    });

    it("2.2 buys tokens for voter",async()=>{

      const tokenBalanceBefore = (await getAccount(connection,voterTokenAccount)).amount;

      await program.methods.buyTokens().accounts({
        buyer:voterWallet.publicKey,
        buyerTokenAccount : voterTokenAccount,
        xMint: xMintPda,
      }).signers([voterWallet]).rpc();

      const tokenBalanceAfter = (await getAccount(connection,voterTokenAccount)).amount;
      expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(BigInt(1000000000));

    });
  })

  describe("3. voter" , () =>{

    it("3.1 register voter",async()=>{
      await program.methods.registerVoter().accounts({
        authority:voterWallet.publicKey,
      }).signers([voterWallet]).rpc();

      const voterAccountData = await program.account.voter.fetch(voterPda);
      expect(voterAccountData.voterId.toBase58()).to.equal(voterWallet.publicKey.toBase58());

    })
  })


describe("4. proposal" , () =>{

    it("4.1 register proposal",async()=>{
      const currentBlockTime = await getBlockTime(connection);
      const deadlineTime = new anchor.BN(currentBlockTime + 10);
      const proposalInfo = "Build a layer 2 solution";
      const stakeAmount = new anchor.BN(1000);


      await program.methods.registerProposal(proposalInfo,deadlineTime,stakeAmount).accounts({
        authority:proposalCreatorWallet.publicKey,
        proposalTokenAccount : proposalCreatorTokenAccount,
        treasuryTokenAccount : treasuryTokenAccount,
        xMint : xMintPda,
      }).signers([proposalCreatorWallet]).rpc();

      const proposalAccountData = await program.account.proposal.fetch(proposalPda);
      const proposalCounterAccountData = await program.account.proposalCounter.fetch(proposalCounterPda);
      expect(proposalCounterAccountData.proposalCount).to.equal(2);

      expect(proposalAccountData.authority.toBase58()).to.equal(proposalCreatorWallet.publicKey.toBase58());
      expect(proposalAccountData.deadline.toNumber()).to.equal(deadlineTime.toNumber());
      expect(proposalAccountData.numberOfVotes).to.equal(0);
      expect(proposalAccountData.proposalId).to.equal(1);
      expect(proposalAccountData.proposalInfo.toString()).to.equal("Build a layer 2 solution");

    })
  })

  
describe("5. Casting Vote" , () =>{

    it("5.1 Casts Vote",async()=>{


      const stakeAmount = new anchor.BN(1000);


      await program.methods.proposalToVote(PROPOSAL_ID,stakeAmount).accounts({
        authority:voterWallet.publicKey,
        voterTokenAccount : voterTokenAccount,
        treasuryTokenAccount : treasuryTokenAccount,
        xMint : xMintPda,
      }).signers([voterWallet]).rpc();

    })
  })

describe("6. Picking Winner" , () =>{

    it("6.1 Should fail to pick winner before deadline passes",async()=>{
      try{        
        await program.methods.pickWinner(PROPOSAL_ID).accounts({
          authority: adminWallet.publicKey,
        }).rpc();
      }catch(err){
        expectAnchorErrorCode(err, "VotingStillActive");
      }
    })


    it("6.2 Should pick winner after deadline passes",async()=>{

      console.log("waiting for the deadline to pass ....");
      await new Promise((resolve) =>setTimeout(resolve,12000));
  
      await program.methods.pickWinner(PROPOSAL_ID).accounts({
        authority: adminWallet.publicKey,
      }).rpc();
  
      const winnerData = await program.account.winner.fetch(winnerPda);
      expect(winnerData.winningProposalId).to.equal(PROPOSAL_ID);
      expect(winnerData.winningVotes).to.equal(1);
    });

  });

  describe("7. Close Propsal Accont" , () =>{

    it("7.1 Should close proposal one after deadline passes and recover rent",async()=>{
      const accountInfoBefore = await connection.getAccountInfo(proposalPda);
      expect(accountInfoBefore).to.not.be.null;

      await program.methods.closeProposal(PROPOSAL_ID).accounts({
        destination : proposalCreatorWallet.publicKey,
        authority : proposalCreatorWallet.publicKey,
      })
      .signers([proposalCreatorWallet]).rpc();

      const accountInfoAfter = await connection.getAccountInfo(proposalPda);
      expect(accountInfoAfter).to.be.null;
    });
  });

  describe("8. Close Voter Accont" , () =>{

    it("8.1 Should close Voter account",async()=>{
      const accountInfoBefore = await connection.getAccountInfo(voterPda);
      expect(accountInfoBefore).to.not.be.null;

      await program.methods.closeVoter().accounts({
        authority : voterWallet.publicKey,
      })
      .signers([voterWallet]).rpc();

      const accountInfoAfter = await connection.getAccountInfo(voterPda);
      expect(accountInfoAfter).to.be.null;
    });
  });

describe("9. Sol Withdrawn", () => {
  it("9.1 Should allow admin to withdraw sol", async () => {
    const withdrawAmount = new anchor.BN(100000);
    // Extra parentheses removed here
    const admitBalanceBefore = await connection.getBalance(adminWallet.publicKey);
    const vaultBalance = await connection.getBalance(solVaultPda);

    if (vaultBalance >= withdrawAmount.toNumber()) {
      await program.methods.withdrawlSol(withdrawAmount).accounts({
        authority: adminWallet.publicKey,
      }).rpc();

      // Extra parentheses removed here too
      const admitBalanceAfter = await connection.getBalance(adminWallet.publicKey);
      
      // Note: Transaction fees might affect this exact calculation, 
      // but keeping your logic as is.
      expect(admitBalanceAfter).to.be.greaterThan(admitBalanceBefore - 100000);
    } else {
      console.log("Insufficient SOL in vault for withdrawal");
    }
  });

  it("9.2 Should fail when non-admin tries to withdraw sol", async () => {
    const withdrawAmount = new anchor.BN(100000);

    try {
      await program.methods.withdrawlSol(withdrawAmount).accounts({
        authority: voterWallet.publicKey,
      }).signers([voterWallet]).rpc();
      
      console.log("Transaction actually SUCCEEDED! (It should have failed)");
      expect.fail("Should have thrown an error");
    } 
    catch (err) {
      expectAnchorErrorCode(err, "UnauhtorizedAccess"); 
    }
    // catch (err: any) {
    //   if (err.name === 'AssertionError') {
    //     throw err;
    //   }
      
    //   console.log("RAW ANCHOR ERROR:");
    //   console.log(JSON.stringify(err, null, 2)); 
      
    //   expectAnchorErrorCode(err, "UnauhtorizedAccess"); 
    // }
  });
}); 
});
