require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    // Keep local development network for testing
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: 5777,
      chain_id: 1337,
      gas: 6721975,
      gasPrice: 20000000000,
    },
    // Sepolia testnet for production deployment
    sepolia: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        process.env.ALCHEMY_SEPOLIA_URL
      ),
      network_id: 11155111,    // Sepolia's network ID
      gas: 2500000,            // Lowered from 5500000 to fit within 0.05 ETH balance
      gasPrice: 10000000000,   // Lowered to 10 gwei (10000000000 wei)
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },
  compilers: {
    solc: {
      version: "0.5.16",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
