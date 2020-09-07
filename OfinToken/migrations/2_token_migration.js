const OFINToken = artifacts.require("OFINToken");

module.exports = function (deployer) {
  deployer.deploy(OFINToken);
};