module.exports = {
  networks: {
    development: {
      host: "192.168.137.1",
      port: 7545,
      network_id: 5777,
      chain_id: 1337,
      gas: 6721975,
      gasPrice: 20000000000,
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
