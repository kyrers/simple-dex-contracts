import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "./utils/fixtures";
import { INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B } from "./utils/constants";
import { sqrt } from "./utils/math";

describe("# SIMPLE DEX ADD LIQUIDITY #", function () {
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
