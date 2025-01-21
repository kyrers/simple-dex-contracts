import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "./utils/fixtures";
import { INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B } from "./utils/constants";
import {
  addInitialLiquidity,
  verifyRemoveLiquidityState,
} from "./utils/helpers";

describe("# SIMPLE DEX REMOVE LIQUIDITY #", function () {
  it("Should allow user to remove all the liquidity he provided", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    await addInitialLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);

    await expect(
      simpleDex.removeLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B)
    )
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

    await verifyRemoveLiquidityState(simpleDex, tokenA, tokenB, owner.address, {
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

    //Must keep the ratio
    const liquidityToRemoveA = ethers.parseEther("50");
    const liquidityToRemoveB = ethers.parseEther("100");

    await addInitialLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);

    //This is also corresponds to the total lp tokens
    const initialLpBalance = await simpleDex.lpBalances(owner.address);
    const tokensToBurn =
      (liquidityToRemoveA * initialLpBalance) / INITIAL_LIQUIDITY_A;

    await expect(
      simpleDex.removeLiquidity(liquidityToRemoveA, liquidityToRemoveB)
    )
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, liquidityToRemoveA, liquidityToRemoveB);

    await verifyRemoveLiquidityState(simpleDex, tokenA, tokenB, owner.address, {
      expectedLpBalance: initialLpBalance - tokensToBurn,
      expectedReserveA: INITIAL_LIQUIDITY_A - liquidityToRemoveA,
      expectedReserveB: INITIAL_LIQUIDITY_B - liquidityToRemoveB,
      expectedTotalLp: initialLpBalance - tokensToBurn,
      expectedTokenABalance: tokenABalance + liquidityToRemoveA,
      expectedTokenBBalance: tokenBBalance + liquidityToRemoveB,
    });
  });

  it("Should handle removal of very small liquidity amounts correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    await addInitialLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const tokenABalance = await tokenA.balanceOf(owner.address);
    const tokenBBalance = await tokenB.balanceOf(owner.address);
    const smallAmountA = ethers.parseEther("0.0001");
    const smallAmountB = ethers.parseEther("0.0002");

    //This is also corresponds to the total lp tokens
    const initialLpBalance = await simpleDex.lpBalances(owner.address);
    const tokensToBurn =
      (smallAmountA * initialLpBalance) / INITIAL_LIQUIDITY_A;

    await expect(simpleDex.removeLiquidity(smallAmountA, smallAmountB))
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, smallAmountA, smallAmountB);

    await verifyRemoveLiquidityState(simpleDex, tokenA, tokenB, owner.address, {
      expectedLpBalance: initialLpBalance - tokensToBurn,
      expectedReserveA: INITIAL_LIQUIDITY_A - smallAmountA,
      expectedReserveB: INITIAL_LIQUIDITY_B - smallAmountB,
      expectedTotalLp: initialLpBalance - tokensToBurn,
      expectedTokenABalance: tokenABalance + smallAmountA,
      expectedTokenBBalance: tokenBBalance + smallAmountB,
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
    tokenA.mint(owner.address, largeAmountA);
    tokenB.mint(owner.address, largeAmountB);

    await addInitialLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      largeAmountA,
      largeAmountB
    );

    await expect(simpleDex.removeLiquidity(largeAmountA, largeAmountB))
      .to.emit(simpleDex, "RemoveLiquidity")
      .withArgs(owner.address, largeAmountA, largeAmountB);

    await verifyRemoveLiquidityState(simpleDex, tokenA, tokenB, owner.address, {
      expectedLpBalance: 0n,
      expectedReserveA: 0n,
      expectedReserveB: 0n,
      expectedTotalLp: 0n,
      expectedTokenABalance: tokenABalance + largeAmountA,
      expectedTokenBBalance: tokenBBalance + largeAmountB,
    });
  });

  it("Should revert when removing liquidity with invalid token amounts", async function () {
    const { simpleDex } = await loadFixture(deploySimpleDexFixture);

    await expect(
      simpleDex.removeLiquidity(0, ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(simpleDex, "InvalidTokenAmount");

    await expect(
      simpleDex.removeLiquidity(ethers.parseEther("100"), 0)
    ).to.be.revertedWithCustomError(simpleDex, "InvalidTokenAmount");
  });

  it("Should revert when liquidity is insufficient", async function () {
    const { simpleDex } = await loadFixture(deploySimpleDexFixture);

    await expect(
      simpleDex.removeLiquidity(INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B)
    ).to.be.revertedWithCustomError(simpleDex, "InsufficientLiquidity");
  });

  it("Should revert when removing liquidity breaks the ratio", async function () {
    const { simpleDex, tokenA, tokenB } = await loadFixture(
      deploySimpleDexFixture
    );

    await addInitialLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    await expect(
      simpleDex.removeLiquidity(
        ethers.parseEther("50"),
        ethers.parseEther("75")
      )
    ).to.be.revertedWithCustomError(simpleDex, "InvalidTokenRatio");
  });

  it("Should revert when removing more liquidity than that provided", async function () {
    const { simpleDex, tokenA, tokenB, otherAccount } = await loadFixture(
      deploySimpleDexFixture
    );

    //Add liquidity as owner
    await addInitialLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    //Add more liquidity with a different user
    const extraLiquidityA = ethers.parseEther("200");
    const extraLiquidityB = ethers.parseEther("400");
    await addInitialLiquidity(
      simpleDex.connect(otherAccount),
      tokenA.connect(otherAccount),
      tokenB.connect(otherAccount),
      extraLiquidityA,
      extraLiquidityB
    );

    //As the first user, attempt to remove more liquidity than that provided
    await expect(
      simpleDex.removeLiquidity(extraLiquidityA, extraLiquidityB)
    ).to.be.revertedWithCustomError(simpleDex, "InsufficientLpTokens");
  });
});
