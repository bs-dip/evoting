const Evoting = artifacts.require("./Evoting.sol");

module.exports = function(deployer) {
  deployer.deploy(Evoting);
};
