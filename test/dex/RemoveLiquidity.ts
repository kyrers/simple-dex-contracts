import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "../utils/fixtures";
import { INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B } from "../utils/constants";
import { addLiquidity, verifyRemoveLiquidityState } from "../utils/helpers";

describe("# SIMPLE DEX REMOVE LIQUIDITY #", function () {
  it("Should allow user to remove all the liquidity he provided", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);
    const lpBalance = await simpleDex.lpBalances(owner.address);

    await expect(simpleDex.removeLiquidity(lpBalance))
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

    await verifyRemoveLiquidityState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedLpBalance: 0n,
      expectedReserveA: 0n,
      expectedReserveB: 0n,
      expectedTotalLp: 0n,
      expectedTokenABalance: tokenABalance + INITIAL_LIQUIDITY_A,
      expectedTokenBBalance: tokenBBalance + INITIAL_LIQUIDITY_B,
    });
  });

  it("Should allow user to remove part of the liquidity he provided", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);
    const initialLpBalance = await simpleDex.lpBalances(owner.address);

    // Remove half the LP tokens
    const lpTokensToBurn = initialLpBalance / 2n;

    // Calculate expected token amounts
    const expectedAmountA =
      (lpTokensToBurn * INITIAL_LIQUIDITY_A) / initialLpBalance;
    const expectedAmountB =
      (lpTokensToBurn * INITIAL_LIQUIDITY_B) / initialLpBalance;

    await expect(simpleDex.removeLiquidity(lpTokensToBurn))
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, expectedAmountA, expectedAmountB);

    await verifyRemoveLiquidityState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedLpBalance: initialLpBalance - lpTokensToBurn,
      expectedReserveA: INITIAL_LIQUIDITY_A - expectedAmountA,
      expectedReserveB: INITIAL_LIQUIDITY_B - expectedAmountB,
      expectedTotalLp: initialLpBalance - lpTokensToBurn,
      expectedTokenABalance: tokenABalance + expectedAmountA,
      expectedTokenBBalance: tokenBBalance + expectedAmountB,
    });
  });

  it("Should handle removal of very small liquidity amounts correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);
    const initialLpBalance = await simpleDex.lpBalances(owner.address);
    const lpTokensToBurn = ethers.parseEther("0.0001");

    // Calculate expected amounts
    const expectedAmountA =
      (lpTokensToBurn * INITIAL_LIQUIDITY_A) / initialLpBalance;
    const expectedAmountB =
      (lpTokensToBurn * INITIAL_LIQUIDITY_B) / initialLpBalance;

    await expect(simpleDex.removeLiquidity(lpTokensToBurn))
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, expectedAmountA, expectedAmountB);

    await verifyRemoveLiquidityState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedLpBalance: initialLpBalance - lpTokensToBurn,
      expectedReserveA: INITIAL_LIQUIDITY_A - expectedAmountA,
      expectedReserveB: INITIAL_LIQUIDITY_B - expectedAmountB,
      expectedTotalLp: initialLpBalance - lpTokensToBurn,
      expectedTokenABalance: tokenABalance + expectedAmountA,
      expectedTokenBBalance: tokenBBalance + expectedAmountB,
    });
  });

  it("Should handle removal of very large liquidity amounts correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);
    const largeAmountA = ethers.parseEther("1000000");
    const largeAmountB = ethers.parseEther("2000000");
    tokenA.mint(largeAmountA);
    tokenB.mint(largeAmountB);

    await addLiquidity(simpleDex, tokenA, tokenB, largeAmountA, largeAmountB);

    const lpBalance = await simpleDex.lpBalances(owner.address);

    await expect(simpleDex.removeLiquidity(lpBalance))
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, largeAmountA, largeAmountB);

    await verifyRemoveLiquidityState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedLpBalance: 0n,
      expectedReserveA: 0n,
      expectedReserveB: 0n,
      expectedTotalLp: 0n,
      expectedTokenABalance: tokenABalance + largeAmountA,
      expectedTokenBBalance: tokenBBalance + largeAmountB,
    });
  });

  it("Should allow LP to collect fees from swaps when removing liquidity", async function () {
    const { simpleDex, tokenA, tokenB, owner, otherAccount } =
      await loadFixture(deploySimpleDexFixture);

    await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    // Do swap with otherAccount
    const swapAmount = ethers.parseEther("10");
    await tokenA.connect(otherAccount).mint(swapAmount);
    await tokenA.connect(otherAccount).approve(simpleDex.target, swapAmount);

    // Calculate how much he'll get from the swap
    const amountOut = await simpleDex.getAmountOut(
      swapAmount,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );
    await simpleDex.connect(otherAccount).swap(tokenA.target, swapAmount);

    // Remove all liquidity
    const lpBalance = await simpleDex.lpBalances(owner.address);
    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);

    await expect(simpleDex.removeLiquidity(lpBalance))
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(
        owner.address,
        INITIAL_LIQUIDITY_A + swapAmount,
        INITIAL_LIQUIDITY_B - amountOut
      );

    await verifyRemoveLiquidityState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedLpBalance: 0n,
      expectedReserveA: 0n,
      expectedReserveB: 0n,
      expectedTotalLp: 0n,
      expectedTokenABalance: tokenABalance + INITIAL_LIQUIDITY_A + swapAmount,
      expectedTokenBBalance: tokenBBalance + INITIAL_LIQUIDITY_B - amountOut,
    });
  });

  it("Should revert when removing an invalid liquidity amount", async function () {
    const { simpleDex } = await loadFixture(deploySimpleDexFixture);

    await expect(simpleDex.removeLiquidity(0)).to.be.revertedWithCustomError(
      simpleDex,
      "InvalidBurnAmount"
    );
  });

  it("Should revert when trying to burn more LP tokens than owned", async function () {
    const { simpleDex, tokenA, tokenB, owner, otherAccount } =
      await loadFixture(deploySimpleDexFixture);

    await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const ownerLpBalance = await simpleDex.lpBalances(owner.address);

    await expect(
      simpleDex.connect(otherAccount).removeLiquidity(ownerLpBalance)
    ).to.be.revertedWithCustomError(simpleDex, "InsufficientLpTokens");
  });
});
