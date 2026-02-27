# 🗳️ Solana Decentralized Voting dApp

A full-stack Web3 voting application built on the Solana blockchain. This dApp allows an administrator to initialize a treasury and issue custom voting tokens (SPL Tokens). Users can purchase these tokens using SOL and use them to vote on active proposals securely on-chain.

## ✨ Features

* **Treasury Initialization:** Admin can set up a treasury, create a custom SPL token (`xMint`), and define the token price in SOL.
* **Token Purchasing:** Users can seamlessly buy voting tokens via their Phantom wallet. The smart contract automatically handles ATA (Associated Token Account) creation and SOL transfers.
* **On-Chain Voting:** Transparent and immutable voting mechanism using the Solana blockchain.
* **Devnet Ready:** Fully configured to run and test on the Solana Devnet.

## 🛠️ Tech Stack

### Backend (Smart Contracts)
* **Rust**
* **Anchor Framework**
* **Solana Program Library (SPL)**

### Frontend
* **React.js**
* **Vite** (for fast, optimized builds)
* **@solana/web3.js** & **@project-serum/anchor**
* **Phantom Wallet Integration**

## 🚀 Prerequisites

Make sure you have the following installed on your machine (WSL/Linux recommended for the smoothest experience):

* [Rust & Cargo](https://www.rust-lang.org/tools/install)
* [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
* [Anchor CLI](https://www.anchor-lang.com/docs/installation)
* [Node.js](https://nodejs.org/) (v16 or higher)
* [Phantom Wallet](https://phantom.app/) browser extension (Set to Devnet)

## 💻 Local Setup & Deployment

### 1. Clone the Repository
```bash
git clone [https://github.com/ShashwatGauniyal/Rust-voting-application.git](https://github.com/ShashwatGauniyal/Rust-voting-application.git)
cd Rust-voting-application
```

### 2. Backend Setup (Solana/Anchor)
First, configure your Solana CLI to use the Devnet environment and ensure you have a local wallet keypair:
```bash
solana config set --url devnet
solana-keygen new
```

Request some Devnet SOL to cover the deployment gas fees (Note: Devnet has rate limits, so asking for 2 SOL is optimal):
```bash
solana airdrop 2
```

Build the smart contract. This initial build generates your unique Program ID:
```bash
anchor build
```

Sync this newly generated Program ID with your `Anchor.toml` and `lib.rs` files:
```bash
anchor keys sync
```

Re-build the project to compile with the newly synced keys, and deploy the smart contract to the Solana Devnet:
```bash
anchor build
anchor deploy
```
*(⚠️ Note: Copy the Program ID that is outputted after a successful deployment. You will need it for the frontend.)*

### 3. Frontend Setup (React/Vite)
Open a new terminal tab and navigate to your frontend directory (adjust the folder name if yours is different, e.g., `client` or `app`):
```bash
cd client
```

Install all required Node dependencies:
```bash
npm install
```

**🔑 Crucial Step:** Open your frontend configuration file (e.g., `App.jsx`, `constants.js`, or your `.env` file) and replace the old `programID` with the new one you got from the `anchor deploy` step.

Start the Vite development server:
```bash
npm run dev
```

## 👨‍💻 Author
**Shashwat Gauniyal**

Feel free to reach out or contribute to this repository!
