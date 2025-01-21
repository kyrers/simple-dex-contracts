import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { deploySimpleDexFixture } from "../utils/fixtures";

describe("# TOKEN DEPLOYMENT #", function () {
  it("Should deploy TokenA and TokenB with the correct owner", async function () {
    const { tokenA, tokenB, owner } = await loadFixture(deploySimpleDexFixture);

    expect(await tokenA.owner()).to.equal(owner.address);
    expect(await tokenB.owner()).to.equal(owner.address);
  });

  it("Should fail to deploy tokens because address 0 is not a valid owner", async function () {
    const tokenAFactory = await ethers.getContractFactory("TokenA");
    const tokenBFactory = await ethers.getContractFactory("TokenB");

    await expect(
      tokenAFactory.deploy(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(tokenAFactory, "OwnableInvalidOwner");

    await expect(
      tokenBFactory.deploy(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(tokenBFactory, "OwnableInvalidOwner");
  });
});
