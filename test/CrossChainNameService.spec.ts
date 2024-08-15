import { ethers } from "hardhat";
import { assert } from "chai";
import { BigNumber } from "ethers";
import { PromiseOrValue } from "../typechain-types/common";

const regName = "alice.ccns";
let chainSelector: BigNumber;

let localSimulator;
let CCNSLookupReceiver: any;
let CCNSLookupSource: any;
let CCNSRegister: any;
let CCNSReceiver: any;

let config: {
  chainSelector_: BigNumber;
  sourceRouter_: PromiseOrValue<string>;
  destinationRouter_: PromiseOrValue<string>;
  wrappedNative_: String;
  linkToken_: String;
  ccipBnM_: String;
  ccipLnM_: String;
};

try {
  describe("CCIP Bootcamp Day 2 HW", function () {
    it("Deploy Local Simulator and call configuration", async function () {
      // Create an instance of CCIPLocalSimulator.sol smart contract.
      const localSimulatorFactory = await ethers.getContractFactory(
        "CCIPLocalSimulator"
      );
      localSimulator = await localSimulatorFactory.deploy();

      // Call the configuration() function to get Router contract address.
      config = await localSimulator.configuration();

      chainSelector = config.chainSelector_;

      console.log(
        `The source router is: ${config.sourceRouter_} and the destination router is: ${config.destinationRouter_}`
      );
    });

    // Create instances of CrossChainNameServiceRegister.sol, CrossChainNameServiceReceiver.sol and
    // CrossChainNameServiceLookup.sol smart contracts and call the enableChain() function where needed.
    it("Deploy CCNS contracts", async function () {
      const CCNSLookupFactory = await ethers.getContractFactory(
        "CrossChainNameServiceLookup"
      );

      // CCNSLookupSource will be deployed in both source and destination chains.
      CCNSLookupSource = await CCNSLookupFactory.deploy();
      CCNSLookupReceiver = await CCNSLookupFactory.deploy();

      // The CCNSRegister is "source side" and will be deployed in the source chain.
      const CCNSRegisterFactory = await ethers.getContractFactory(
        "CrossChainNameServiceRegister"
      );
      CCNSRegister = await CCNSRegisterFactory.deploy(
        config.sourceRouter_,
        CCNSLookupSource.address
      );

      await CCNSLookupSource.setCrossChainNameServiceAddress(
        CCNSRegister.address
      );

      const CCNSReceiverFactory = await ethers.getContractFactory(
        "CrossChainNameServiceReceiver"
      );
      CCNSReceiver = await CCNSReceiverFactory.deploy(
        config.destinationRouter_,
        CCNSLookupReceiver.address,
        chainSelector
      );

      await CCNSLookupReceiver.setCrossChainNameServiceAddress(
        CCNSReceiver.address
      );

      // when the chain is enabled, the CCNSReceiver will be able to receive the name registration.
      await CCNSRegister.enableChain(
        chainSelector,
        CCNSReceiver.address,
        500_000
      );
    });

    it("Register name and verify", async function () {
      // please note in the homework it is mentioned that the name and the address should be passed as arguments
      // but the function signature of the register function in CrossChainNameServiceRegister.sol
      // is register(string memory name) and the address is derived from the sender's address.
      await CCNSRegister.register(regName);

      const resultSource = await CCNSLookupSource.lookup(regName);
      assert.notEqual(
        resultSource,
        0,
        "Source Receiver Lookup result must not be zero"
      );

      const resultDest = await CCNSLookupReceiver.lookup(regName);
      assert.equal(
        resultSource,
        resultDest,
        "Source and Destination lookups don't match."
      );

      console.log(
        `Name ${regName} registered. Source: ${resultSource}, Destination: ${resultDest}`
      );
    });
  });
} catch (e: any) {
  console.log(e.message);
}

/**
 * To run the test, execute the following command:
 * npx hardhat node (in a separate terminal)
 * npx hardhat test --network localhost
 */

/**
 * The tests will only pass in a local environment.
 * For testnet or mainnet, we have to perform other steps
 * such as funding the contract to pay for gas fees.
 */
