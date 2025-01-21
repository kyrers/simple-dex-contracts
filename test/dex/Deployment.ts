import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { deploySimpleDexFixture } from "../utils/fixtures";

describe("# SIMPLE DEX DEPLOYMENT #", function () {
  it("Should deploy the SimpleDex with the right token addresses", async function () {
    const { simpleDex, tokenA, tokenB } = await loadFixture(
      deploySimpleDexFixture
    );

    expect(await simpleDex.tokenA()).to.equal(tokenA.target);
    expect(await simpleDex.tokenB()).to.equal(tokenB.target);
  });

  it("Should fail to deploy the Simple DEX because address 0 is not a valid token address", async function () {
    const simpleDexFactory = await ethers.getContractFactory("SimpleDex");
    await expect(
      simpleDexFactory.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(simpleDexFactory, "InvalidTokenAddress");
  });
});
