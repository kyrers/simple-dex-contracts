import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "../utils/fixtures";
import { INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B } from "../utils/constants";
import { addLiquidity, verifySwapState } from "../utils/helpers";

describe("# SIMPLE DEX SWAP #", function () {
  it("Should allow user to Swap Token A for B and maintain the ratio", async function () {
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

    const swapAmount = ethers.parseEther("10");
    await tokenA.approve(simpleDex.target, swapAmount);

    const expectedAmountOut = await simpleDex.getAmountOut(
      swapAmount,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );
    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);

    await expect(simpleDex.swap(tokenA.target, swapAmount))
      .to.emit(simpleDex, "Swap")
      .withArgs(
        owner.address,
        tokenA.target,
        swapAmount,
        tokenB.target,
        expectedAmountOut
      );

    await verifySwapState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedReserveA: INITIAL_LIQUIDITY_A + swapAmount,
      expectedReserveB: INITIAL_LIQUIDITY_B - expectedAmountOut,
      expectedTokenABalance: tokenABalanceBefore - swapAmount,
      expectedTokenBBalance: tokenBBalanceBefore + expectedAmountOut,
      initialRatio: INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B,
    });
  });

  it("Should allow user to Swap Token B for A and maintain the ratio", async function () {
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

    const swapAmount = ethers.parseEther("10");
    await tokenB.approve(simpleDex.target, swapAmount);

    const expectedAmountOut = await simpleDex.getAmountOut(
      swapAmount,
      INITIAL_LIQUIDITY_B,
      INITIAL_LIQUIDITY_A
    );
    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);

    await expect(simpleDex.swap(tokenB.target, swapAmount))
      .to.emit(simpleDex, "Swap")
      .withArgs(
        owner.address,
        tokenB.target,
        swapAmount,
        tokenA.target,
        expectedAmountOut
      );

    await verifySwapState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedReserveA: INITIAL_LIQUIDITY_A - expectedAmountOut,
      expectedReserveB: INITIAL_LIQUIDITY_B + swapAmount,
      expectedTokenABalance: tokenABalanceBefore + expectedAmountOut,
      expectedTokenBBalance: tokenBBalanceBefore - swapAmount,
      initialRatio: INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B,
    });
  });

  it("Should handle small swaps correctly", async function () {
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

    const swapAmount = ethers.parseEther("0.001");
    await tokenA.approve(simpleDex.target, swapAmount);

    const expectedAmountOut = await simpleDex.getAmountOut(
      swapAmount,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );
    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);

    await expect(simpleDex.swap(tokenA.target, swapAmount))
      .to.emit(simpleDex, "Swap")
      .withArgs(
        owner.address,
        tokenA.target,
        swapAmount,
        tokenB.target,
        expectedAmountOut
      );

    await verifySwapState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedReserveA: INITIAL_LIQUIDITY_A + swapAmount,
      expectedReserveB: INITIAL_LIQUIDITY_B - expectedAmountOut,
      expectedTokenABalance: tokenABalanceBefore - swapAmount,
      expectedTokenBBalance: tokenBBalanceBefore + expectedAmountOut,
      initialRatio: INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B,
    });
  });

  it("Should handle large swaps correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    const largeAmountA = ethers.parseEther("1000000");
    const largeAmountB = ethers.parseEther("2000000");
    tokenA.mint(owner.address, largeAmountA);
    tokenB.mint(owner.address, largeAmountB);

    await addLiquidity(simpleDex, tokenA, tokenB, largeAmountA, largeAmountB);

    const swapAmount = ethers.parseEther("100000");
    //Mint more A tokens to the user and swap them
    tokenA.mint(owner.address, swapAmount);
    await tokenA.approve(simpleDex.target, swapAmount);

    const expectedAmountOut = await simpleDex.getAmountOut(
      swapAmount,
      largeAmountA,
      largeAmountB
    );
    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);

    await expect(simpleDex.swap(tokenA.target, swapAmount))
      .to.emit(simpleDex, "Swap")
      .withArgs(
        owner.address,
        tokenA.target,
        swapAmount,
        tokenB.target,
        expectedAmountOut
      );

    await verifySwapState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedReserveA: largeAmountA + swapAmount,
      expectedReserveB: largeAmountB - expectedAmountOut,
      expectedTokenABalance: tokenABalanceBefore - swapAmount,
      expectedTokenBBalance: tokenBBalanceBefore + expectedAmountOut,
      initialRatio: largeAmountA * largeAmountB,
    });
  });

  it("Should handle multiple swaps correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner, otherAccount } =
      await loadFixture(deploySimpleDexFixture);

    await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const swapAmount = ethers.parseEther("10");

    //First swap using owner
    await tokenA.approve(simpleDex.target, swapAmount);

    const expectedAmountOut = await simpleDex.getAmountOut(
      swapAmount,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);

    await expect(simpleDex.swap(tokenA.target, swapAmount))
      .to.emit(simpleDex, "Swap")
      .withArgs(
        owner.address,
        tokenA.target,
        swapAmount,
        tokenB.target,
        expectedAmountOut
      );

    //Reserves to use in the second swap
    const newReserveA = INITIAL_LIQUIDITY_A + swapAmount;
    const newReserveB = INITIAL_LIQUIDITY_B - expectedAmountOut;

    await verifySwapState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedReserveA: newReserveA,
      expectedReserveB: newReserveB,
      expectedTokenABalance: tokenABalanceBefore - swapAmount,
      expectedTokenBBalance: tokenBBalanceBefore + expectedAmountOut,
      initialRatio: INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B,
    });

    //Second swap using otherAccount
    await tokenB.connect(otherAccount).approve(simpleDex.target, swapAmount);

    const expectedAmountOutOther = await simpleDex.getAmountOut(
      swapAmount,
      newReserveB,
      newReserveA
    );

    const tokenABalanceBeforeOther = await tokenA.balanceOf(
      otherAccount.address
    );
    const tokenBBalanceBeforeOther = await tokenB.balanceOf(
      otherAccount.address
    );

    await expect(
      simpleDex.connect(otherAccount).swap(tokenB.target, swapAmount)
    )
      .to.emit(simpleDex, "Swap")
      .withArgs(
        otherAccount.address,
        tokenB.target,
        swapAmount,
        tokenA.target,
        expectedAmountOutOther
      );

    await verifySwapState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: otherAccount.address,
      expectedReserveA: newReserveA - expectedAmountOutOther,
      expectedReserveB: newReserveB + swapAmount,
      expectedTokenABalance: tokenABalanceBeforeOther + expectedAmountOutOther,
      expectedTokenBBalance: tokenBBalanceBeforeOther - swapAmount,
      initialRatio: newReserveA * newReserveB,
    });
  });

  it("Should correctly apply 0.3% fee on swaps", async function () {
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

    const swapAmount = ethers.parseEther("1000");
    await tokenA.mint(owner.address, swapAmount);
    await tokenA.approve(simpleDex.target, swapAmount);

    const expectedAmountOut = await simpleDex.getAmountOut(
      swapAmount,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    //Calculate amount out without fee
    //The denominator still needs to reflect the fee reduction because the contract applies the fee by only using 99.7% of the input for the swap.
    //If we didn't adjust the denominator, the difference between the expected and actual amounts would be too small, leading to a ratio close to 1 instead of 0.997.
    //We divide by 1000 to correctly scale the fee adjustment.
    const amountOutWithoutFee =
      (swapAmount * INITIAL_LIQUIDITY_B) /
      (INITIAL_LIQUIDITY_A + (swapAmount * 997n) / 1000n);

    //Ratio should be ~0.997 because that corresponds to the 0.3% fee
    const ratio = Number(expectedAmountOut) / Number(amountOutWithoutFee);
    expect(ratio).to.be.closeTo(0.997, 0.001);

    const tokenABalanceBefore = await tokenA.balanceOf(owner.address);
    const tokenBBalanceBefore = await tokenB.balanceOf(owner.address);

    await expect(simpleDex.swap(tokenA.target, swapAmount))
      .to.emit(simpleDex, "Swap")
      .withArgs(
        owner.address,
        tokenA.target,
        swapAmount,
        tokenB.target,
        expectedAmountOut
      );

    await verifySwapState({
      simpleDex,
      tokenA,
      tokenB,
      accountAddress: owner.address,
      expectedReserveA: INITIAL_LIQUIDITY_A + swapAmount,
      expectedReserveB: INITIAL_LIQUIDITY_B - expectedAmountOut,
      expectedTokenABalance: tokenABalanceBefore - swapAmount,
      expectedTokenBBalance: tokenBBalanceBefore + expectedAmountOut,
      initialRatio: INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B,
    });
  });

  it("Should revert when swapping with invalid amounts", async function () {
    const { simpleDex, tokenA, tokenB } = await loadFixture(
      deploySimpleDexFixture
    );

    await expect(simpleDex.swap(tokenA.target, 0))
      .to.be.revertedWithCustomError(simpleDex, "InvalidSwapAmount")
      .withArgs(0);

    await expect(simpleDex.swap(tokenB.target, 0))
      .to.be.revertedWithCustomError(simpleDex, "InvalidSwapAmount")
      .withArgs(0);
  });

  it("Should revert when an invalid token address is provided", async function () {
    const { simpleDex, otherAccount } = await loadFixture(
      deploySimpleDexFixture
    );

    const swapAmount = ethers.parseEther("1");

    await expect(simpleDex.swap(ethers.ZeroAddress, swapAmount))
      .to.be.revertedWithCustomError(simpleDex, "InvalidToken")
      .withArgs(ethers.ZeroAddress);

    await expect(simpleDex.swap(otherAccount.address, swapAmount))
      .to.be.revertedWithCustomError(simpleDex, "InvalidToken")
      .withArgs(otherAccount.address);
  });

  it("Should revert when there's insufficient liquidity", async function () {
    const { simpleDex, tokenA, tokenB } = await loadFixture(
      deploySimpleDexFixture
    );

    await expect(
      simpleDex.swap(tokenA.target, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(simpleDex, "InsufficientLiquidity");

    await expect(
      simpleDex.swap(tokenB.target, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(simpleDex, "InsufficientLiquidity");
  });
});
