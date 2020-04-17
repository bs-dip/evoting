const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  contracts_build_directory: "./src/contracts/",
  contracts_directory: "./contracts",
  migrations_directory: "./migrations",
  solc: {
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000000
      }
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
    },
    ropsten: {
      provider: function () {
        return new HDWalletProvider(
          "693EAAD7799EB00ECF33BD5669663B60D58FE408A2A7E6D3FCB2521CA09C37E4",
          "https://ropsten.infura.io/v3/73144deaea414730a374fa43e57abe7a"
        );
      },
      network_id: "3"
    }
  }
};