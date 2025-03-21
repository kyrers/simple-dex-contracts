import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "../utils/fixtures";
import { INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B } from "../utils/constants";
import {
  addLiquidity,
  sqrt,
  verifyAddLiquidityState,
  getPermitSignature,
  addLiquidityWithPermit,
} from "../utils/helpers";

describe("# SIMPLE DEX ADD LIQUIDITY #", function () {
  it("Should add initial liquidity correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    const tx = await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    await expect(tx)
      .to.emit(simpleDex, "AddLiquidity")
      .withArgs(owner.address, INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

    const expectedLpTokens = sqrt(INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B);

    await verifyAddLiquidityState({
      simpleDex,
      accountAddress: owner.address,
      expectedLpBalance: expectedLpTokens,
      expectedReserveA: INITIAL_LIQUIDITY_A,
      expectedReserveB: INITIAL_LIQUIDITY_B,
      expectedTotalLp: expectedLpTokens,
    });
  });

  it("Should add liquidity using permits instead of approvals correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const tx = await addLiquidityWithPermit(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B,
      owner,
      deadline
    );

    await expect(tx)
      .to.emit(simpleDex, "AddLiquidity")
      .withArgs(owner.address, INITIAL_LIQUIDITY_A, INITIAL_LIQUIDITY_B);

    const expectedLpTokens = sqrt(INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B);

    await verifyAddLiquidityState({
      simpleDex,
      accountAddress: owner.address,
      expectedLpBalance: expectedLpTokens,
      expectedReserveA: INITIAL_LIQUIDITY_A,
      expectedReserveB: INITIAL_LIQUIDITY_B,
      expectedTotalLp: expectedLpTokens,
    });
  });

  it("Should add subsequent liquidity respecting the ratio", async function () {
    const { simpleDex, tokenA, tokenB, owner, otherAccount } =
      await loadFixture(deploySimpleDexFixture);

    //Add initial liquidity with owner
    await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B
    );

    const firstTxLpTokens = sqrt(INITIAL_LIQUIDITY_A * INITIAL_LIQUIDITY_B);
    const additionalAmountA = ethers.parseEther("50");
    const additionalAmountB = ethers.parseEther("100");

    //Add subsequent liquidity with otherAccount
    const tx = await addLiquidity(
      simpleDex.connect(otherAccount),
      tokenA.connect(otherAccount),
      tokenB.connect(otherAccount),
      additionalAmountA,
      additionalAmountB
    );

    const secondTxLpTokens =
      (additionalAmountA * firstTxLpTokens) / INITIAL_LIQUIDITY_A;

    await expect(tx)
      .to.emit(simpleDex, "AddLiquidity")
      .withArgs(otherAccount.address, additionalAmountA, additionalAmountB);

    await verifyAddLiquidityState({
      simpleDex,
      accountAddress: otherAccount.address,
      expectedReserveA: INITIAL_LIQUIDITY_A + additionalAmountA,
      expectedReserveB: INITIAL_LIQUIDITY_B + additionalAmountB,
      expectedTotalLp: firstTxLpTokens + secondTxLpTokens,
      expectedLpBalance: secondTxLpTokens,
    });
  });

  it("Should handle very small liquidity amounts correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    const smallAmountA = ethers.parseEther("0.0001");
    const smallAmountB = ethers.parseEther("0.0002");

    const tx = await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      smallAmountA,
      smallAmountB
    );

    await expect(tx)
      .to.emit(simpleDex, "AddLiquidity")
      .withArgs(owner.address, smallAmountA, smallAmountB);

    const expectedLpTokens = sqrt(smallAmountA * smallAmountB);

    await verifyAddLiquidityState({
      simpleDex,
      accountAddress: owner.address,
      expectedReserveA: smallAmountA,
      expectedReserveB: smallAmountB,
      expectedTotalLp: expectedLpTokens,
      expectedLpBalance: expectedLpTokens,
    });
  });

  it("Should handle very large liquidity amounts correctly", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );

    const largeAmountA = ethers.parseEther("1000000");
    const largeAmountB = ethers.parseEther("2000000");
    tokenA.mint(largeAmountA);
    tokenB.mint(largeAmountB);

    const tx = await addLiquidity(
      simpleDex,
      tokenA,
      tokenB,
      largeAmountA,
      largeAmountB
    );

    await expect(tx)
      .to.emit(simpleDex, "AddLiquidity")
      .withArgs(owner.address, largeAmountA, largeAmountB);

    const expectedLpTokens = sqrt(largeAmountA * largeAmountB);

    await verifyAddLiquidityState({
      simpleDex,
      accountAddress: owner.address,
      expectedReserveA: largeAmountA,
      expectedReserveB: largeAmountB,
      expectedTotalLp: expectedLpTokens,
      expectedLpBalance: expectedLpTokens,
    });
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

  it("Should revert when permit deadline has expired", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );
    const expiredDeadline = BigInt(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago

    const signatureA = await getPermitSignature(
      tokenA,
      owner,
      await simpleDex.getAddress(),
      INITIAL_LIQUIDITY_A,
      expiredDeadline
    );
    const { v: vA, r: rA, s: sA } = ethers.Signature.from(signatureA);

    const signatureB = await getPermitSignature(
      tokenB,
      owner,
      await simpleDex.getAddress(),
      INITIAL_LIQUIDITY_B,
      expiredDeadline + 7200n //valid
    );
    const { v: vB, r: rB, s: sB } = ethers.Signature.from(signatureB);

    await expect(
      simpleDex.addLiquidityWithPermit(
        INITIAL_LIQUIDITY_A,
        INITIAL_LIQUIDITY_B,
        expiredDeadline,
        vA,
        rA,
        sA,
        expiredDeadline + 7200n,
        vB,
        rB,
        sB
      )
    ).to.be.revertedWithCustomError(tokenA, "ERC2612ExpiredSignature");
  });

  it("Should revert when permit signature is invalid", async function () {
    const { simpleDex, tokenA, tokenB, owner, otherAccount } =
      await loadFixture(deploySimpleDexFixture);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    //Get signature from otherAccount but try to use it for owner's tokens
    const signatureA = await getPermitSignature(
      tokenA,
      otherAccount,
      await simpleDex.getAddress(),
      INITIAL_LIQUIDITY_A,
      deadline
    );
    const { v: vA, r: rA, s: sA } = ethers.Signature.from(signatureA);

    const signatureB = await getPermitSignature(
      tokenB,
      owner,
      await simpleDex.getAddress(),
      INITIAL_LIQUIDITY_B,
      deadline
    );
    const { v: vB, r: rB, s: sB } = ethers.Signature.from(signatureB);

    await expect(
      simpleDex.addLiquidityWithPermit(
        INITIAL_LIQUIDITY_A,
        INITIAL_LIQUIDITY_B,
        deadline,
        vA,
        rA,
        sA,
        deadline,
        vB,
        rB,
        sB
      )
    ).to.be.revertedWithCustomError(tokenA, "ERC2612InvalidSigner");
  });

  it("Should revert when permits are reused", async function () {
    const { simpleDex, tokenA, tokenB, owner } = await loadFixture(
      deploySimpleDexFixture
    );
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    //Generate signatures once
    const signatureA = await getPermitSignature(
      tokenA,
      owner,
      await simpleDex.getAddress(),
      INITIAL_LIQUIDITY_A,
      deadline
    );
    const { v: vA, r: rA, s: sA } = ethers.Signature.from(signatureA);

    const signatureB = await getPermitSignature(
      tokenB,
      owner,
      await simpleDex.getAddress(),
      INITIAL_LIQUIDITY_B,
      deadline
    );
    const { v: vB, r: rB, s: sB } = ethers.Signature.from(signatureB);

    //First use of permits
    await simpleDex.addLiquidityWithPermit(
      INITIAL_LIQUIDITY_A,
      INITIAL_LIQUIDITY_B,
      deadline,
      vA,
      rA,
      sA,
      deadline,
      vB,
      rB,
      sB
    );

    //Try to reuse the exact same permit parameters
    await expect(
      simpleDex.addLiquidityWithPermit(
        INITIAL_LIQUIDITY_A,
        INITIAL_LIQUIDITY_B,
        deadline,
        vA,
        rA,
        sA,
        deadline,
        vB,
        rB,
        sB
      )
    ).to.be.revertedWithCustomError(tokenA, "ERC2612InvalidSigner");
  });
});
