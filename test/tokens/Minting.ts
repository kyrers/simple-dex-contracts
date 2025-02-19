import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "../utils/fixtures";
import { INITIAL_MINT_AMOUNT } from "../utils/constants";
import { ethers } from "hardhat";

describe("# MINTING TOKENS #", function () {
  it("Should allow any account to mint tokens", async function () {
    const { tokenA, tokenB, owner, otherAccount } = await loadFixture(
      deploySimpleDexFixture
    );

    const mintAmount = ethers.parseEther("1000");

    // Owner minting
    await tokenA.mint(mintAmount);
    await tokenB.mint(mintAmount);

    // Other account minting
    await tokenA.connect(otherAccount).mint(mintAmount);
    await tokenB.connect(otherAccount).mint(mintAmount);

    expect(await tokenA.balanceOf(owner.address)).to.equal(
      INITIAL_MINT_AMOUNT + mintAmount
    );
    expect(await tokenB.balanceOf(owner.address)).to.equal(
      INITIAL_MINT_AMOUNT + mintAmount
    );
    expect(await tokenA.balanceOf(otherAccount.address)).to.equal(
      INITIAL_MINT_AMOUNT + mintAmount
    );
    expect(await tokenB.balanceOf(otherAccount.address)).to.equal(
      INITIAL_MINT_AMOUNT + mintAmount
    );
  });

  it("Should allow minting of different amounts", async function () {
    const { tokenA, tokenB, owner, otherAccount } = await loadFixture(
      deploySimpleDexFixture
    );

    const mintAmount = ethers.parseEther("1000");
    const otherMintAmount = ethers.parseEther("500");

    // Owner minting
    await tokenA.mint(mintAmount);
    await tokenB.mint(mintAmount);

    // Other account minting
    await tokenA.connect(otherAccount).mint(otherMintAmount);
    await tokenB.connect(otherAccount).mint(otherMintAmount);

    expect(await tokenA.balanceOf(owner.address)).to.equal(
      INITIAL_MINT_AMOUNT + mintAmount
    );
    expect(await tokenB.balanceOf(owner.address)).to.equal(
      INITIAL_MINT_AMOUNT + mintAmount
    );
    expect(await tokenA.balanceOf(otherAccount.address)).to.equal(
      INITIAL_MINT_AMOUNT + otherMintAmount
    );
    expect(await tokenB.balanceOf(otherAccount.address)).to.equal(
      INITIAL_MINT_AMOUNT + otherMintAmount
    );
  });
});
