import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers, ignition } from "hardhat";
import TokenAModule from "../ignition/modules/TokenAModule";
import TokenBModule from "../ignition/modules/TokenBModule";
import SimpleDexModule from "../ignition/modules/SimpleDexModule";

const TOKEN_AMOUNT = ethers.parseEther("1000");

describe("## SIMPLE DEX ##", function () {
  async function deploySimpleDexFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    //Deploy contracts
    const { tokenA } = await ignition.deploy(TokenAModule, {
      parameters: {
        TokenAModule: { initialOwner: owner.address },
      },
    });

    const { tokenB } = await ignition.deploy(TokenBModule, {
      parameters: {
        TokenBModule: { initialOwner: owner.address },
      },
    });

    const { simpleDex } = await ignition.deploy(SimpleDexModule, {
      parameters: {
        SimpleDexModule: {
          tokenAAddress: tokenA.target.toString(),
          tokenBAddress: tokenB.target.toString(),
        },
      },
    });

    //Mint tokens to users
    await tokenA.mint(owner.address, TOKEN_AMOUNT);
    await tokenA.mint(otherAccount.address, TOKEN_AMOUNT);
    await tokenB.mint(owner.address, TOKEN_AMOUNT);
    await tokenB.mint(otherAccount.address, TOKEN_AMOUNT);

    return {
      tokenA,
      tokenAAddress: tokenA.target.toString(),
      tokenB,
      tokenBAddress: tokenB.target.toString(),
      simpleDex,
      owner,
      otherAccount,
    };
  }

  describe("# DEPLOYMENT #", function () {
    it("Should deploy TokenA and TokenB with the correct owner", async function () {
      const { tokenA, tokenB, owner } = await loadFixture(
        deploySimpleDexFixture
      );

      expect(await tokenA.owner()).to.equal(owner.address);
      expect(await tokenB.owner()).to.equal(owner.address);
    });

    it("Should deploy the SimpleDex with the right token addresses", async function () {
      const { simpleDex, tokenAAddress, tokenBAddress } = await loadFixture(
        deploySimpleDexFixture
      );

      expect(await simpleDex.tokenA()).to.equal(tokenAAddress);
      expect(await simpleDex.tokenB()).to.equal(tokenBAddress);
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

    it("Should fail to deploy the Simple DEX because address 0 is not a valid token address", async function () {
      const simpleDexFactory = await ethers.getContractFactory("SimpleDex");
      await expect(
        simpleDexFactory.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(simpleDexFactory, "InvalidTokenAddress");
    });
  });

  describe("# MINTING TOKENS #", function () {
    it("Should mint 1000 of each token to the two accounts", async function () {
      const { tokenA, tokenB, owner, otherAccount } = await loadFixture(
        deploySimpleDexFixture
      );

      expect(await tokenA.balanceOf(owner.address)).to.equal(TOKEN_AMOUNT);
      expect(await tokenA.balanceOf(otherAccount.address)).to.equal(
        TOKEN_AMOUNT
      );
      expect(await tokenB.balanceOf(owner.address)).to.equal(TOKEN_AMOUNT);
      expect(await tokenB.balanceOf(otherAccount.address)).to.equal(
        TOKEN_AMOUNT
      );
    });

    it("Should fail to mint tokens because it is not the owner doing it", async function () {
      const { tokenA, tokenB, otherAccount } = await loadFixture(
        deploySimpleDexFixture
      );

      //These type errors are known, see https://github.com/NomicFoundation/hardhat/issues/5112 and https://github.com/NomicFoundation/hardhat/issues/6126
      await expect(
        tokenA.connect(otherAccount).mint(otherAccount.address, 1000)
      ).to.be.revertedWithCustomError(tokenA, "OwnableUnauthorizedAccount");

      await expect(
        tokenB.connect(otherAccount).mint(otherAccount.address, 1000)
      ).to.be.revertedWithCustomError(tokenB, "OwnableUnauthorizedAccount");
    });
  });
});
