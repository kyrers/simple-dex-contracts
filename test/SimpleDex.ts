import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

const TOKEN_AMOUNT = ethers.parseEther("1000");
const INITIAL_LIQUIDITY_A = ethers.parseEther("100");
const INITIAL_LIQUIDITY_B = ethers.parseEther("200");

describe("## SIMPLE DEX ##", function () {
  async function deploySimpleDexFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    //Deploy contracts
    const TokenA = await ethers.getContractFactory("TokenA");
    const tokenA = await TokenA.deploy(owner.address);

    const TokenB = await ethers.getContractFactory("TokenB");
    const tokenB = await TokenB.deploy(owner.address);

    const SimpleDex = await ethers.getContractFactory("SimpleDex");
    const simpleDex = await SimpleDex.deploy(tokenA.target, tokenB.target);

    //Mint tokens to users
    await tokenA.mint(owner.address, TOKEN_AMOUNT);
    await tokenA.mint(otherAccount.address, TOKEN_AMOUNT);
    await tokenB.mint(owner.address, TOKEN_AMOUNT);
    await tokenB.mint(otherAccount.address, TOKEN_AMOUNT);

    return {
      tokenA,
      tokenB,
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
      const { simpleDex, tokenA, tokenB } = await loadFixture(
        deploySimpleDexFixture
      );

      expect(await simpleDex.tokenA()).to.equal(tokenA.target);
      expect(await simpleDex.tokenB()).to.equal(tokenB.target);
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

  describe("# ADD LIQUIDITY #", function () {
    function sqrt(value: bigint): bigint {
      let x = value;
      let y = (x + 1n) / 2n;
      while (y < x) {
        x = y;
        y = (value / y + y) / 2n;
      }
      return x;
    }

    it("Should add initial liquidity correctly", async function () {
      const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
        deploySimpleDexFixture
      );

      await tokenA.approve(simpleDex.target, INITIAL_LIQUIDITY_A);
      await tokenB.approve(simpleDex.target, INITIAL_LIQUIDITY_B);

      await expect(
        simpleDex.addLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B)
      )
        .to.emit(simpleDex, "AddLiquidity")
        .withArgs(owner.address, INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

      const expectedLpTokens = sqrt(INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B);
      expect(await simpleDex.reserveA()).to.equal(INITIAL_LIQUIDITY_A);
      expect(await simpleDex.reserveB()).to.equal(INITIAL_LIQUIDITY_B);
      expect(await simpleDex.totalLpTokens()).to.equal(expectedLpTokens);
      expect(await simpleDex.lpBalances(owner.address)).to.equal(
        expectedLpTokens
      );
    });

    it("Should add subsequent liquidity respecting the ratio", async function () {
      const { simpleDex, tokenA, tokenB, otherAccount } = await loadFixture(
        deploySimpleDexFixture
      );

      await tokenA.approve(simpleDex.target, INITIAL_LIQUIDITY_A);
      await tokenB.approve(simpleDex.target, INITIAL_LIQUIDITY_B);
      await simpleDex.addLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

      const additionalAmountA = ethers.parseEther("50");
      const additionalAmountB = ethers.parseEther("100");

      await tokenA
        .connect(otherAccount)
        .approve(simpleDex.target, additionalAmountA);
      await tokenB
        .connect(otherAccount)
        .approve(simpleDex.target, additionalAmountB);

      await expect(
        simpleDex
          .connect(otherAccount)
          .addLiquidity(additionalAmountA, additionalAmountB)
      )
        .to.emit(simpleDex, "AddLiquidity")
        .withArgs(otherAccount.address, additionalAmountA, additionalAmountB);

      expect(await simpleDex.reserveA()).to.equal(
        INITIAL_LIQUIDITY_A + additionalAmountA
      );
      expect(await simpleDex.reserveB()).to.equal(
        INITIAL_LIQUIDITY_B + additionalAmountB
      );
    });

    it("Should handle very small liquidity amounts correctly", async function () {
      const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
        deploySimpleDexFixture
      );

      const smallAmountA = ethers.parseEther("0.0001");
      const smallAmountB = ethers.parseEther("0.0002");

      await tokenA.approve(simpleDex.target, smallAmountA);
      await tokenB.approve(simpleDex.target, smallAmountB);

      await expect(simpleDex.addLiquidity(smallAmountA, smallAmountB))
        .to.emit(simpleDex, "AddLiquidity")
        .withArgs(owner.address, smallAmountA, smallAmountB);

      const expectedLpTokens = sqrt(smallAmountA * smallAmountB);
      expect(await simpleDex.totalLpTokens()).to.equal(expectedLpTokens);
      expect(await simpleDex.lpBalances(owner.address)).to.equal(
        expectedLpTokens
      );
    });

    it("Should handle very large liquidity amounts correctly", async function () {
      const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
        deploySimpleDexFixture
      );

      const largeAmountA = ethers.parseEther("1000000");
      const largeAmountB = ethers.parseEther("2000000");

      tokenA.mint(owner.address, largeAmountA);
      tokenB.mint(owner.address, largeAmountB);

      await tokenA.approve(simpleDex.target, largeAmountA);
      await tokenB.approve(simpleDex.target, largeAmountB);

      await expect(simpleDex.addLiquidity(largeAmountA, largeAmountB))
        .to.emit(simpleDex, "AddLiquidity")
        .withArgs(owner.address, largeAmountA, largeAmountB);

      const expectedLpTokens = sqrt(largeAmountA * largeAmountB);
      expect(await simpleDex.totalLpTokens()).to.equal(expectedLpTokens);
      expect(await simpleDex.lpBalances(owner.address)).to.equal(
        expectedLpTokens
      );
    });

    it("Should revert when adding liquidity with invalid amounts", async function () {
      const { simpleDex } = await loadFixture(deploySimpleDexFixture);

      await expect(
        simpleDex.addLiquidity(0, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(simpleDex, "InvalidTokenAmount");

      await expect(
        simpleDex.addLiquidity(ethers.parseEther("100"), 0)
      ).to.be.revertedWithCustomError(simpleDex, "InvalidTokenAmount");
    });

    it("Should revert when the ratio is invalid", async function () {
      const { simpleDex, tokenA, tokenB } = await loadFixture(
        deploySimpleDexFixture
      );

      await tokenA.approve(simpleDex.target, INITIAL_LIQUIDITY_A);
      await tokenB.approve(simpleDex.target, INITIAL_LIQUIDITY_B);
      await simpleDex.addLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

      //Breaks the original 2:1 ratio
      const invalidAmountB = ethers.parseEther("150");
      await tokenA.approve(simpleDex.target, INITIAL_LIQUIDITY_A);

      await expect(
        simpleDex.addLiquidity(INITIAL_LIQUIDITY_A, invalidAmountB)
      ).to.be.revertedWithCustomError(simpleDex, "InvalidTokenRatio");
    });

    it("Should revert when approval is insufficient", async function () {
      const { simpleDex, tokenA, tokenB } = await loadFixture(
        deploySimpleDexFixture
      );

      //Only approve tokenA
      await tokenA.approve(simpleDex.target, INITIAL_LIQUIDITY_A);

      await expect(
        simpleDex.addLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B)
      ).to.be.revertedWithCustomError(tokenB, "ERC20InsufficientAllowance");
    });
  });
});
