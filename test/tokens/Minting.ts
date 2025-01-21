import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "../utils/fixtures";
import { INITIAL_MINT_AMOUNT } from "../utils/constants";

describe("# MINTING TOKENS #", function () {
  it("Should mint 1000 of each token to the two accounts", async function () {
    const { tokenA, tokenB, owner, otherAccount } = await loadFixture(
      deploySimpleDexFixture
    );

    expect(await tokenA.balanceOf(owner.address)).to.equal(INITIAL_MINT_AMOUNT);
    expect(await tokenA.balanceOf(otherAccount.address)).to.equal(
      INITIAL_MINT_AMOUNT
    );
    expect(await tokenB.balanceOf(owner.address)).to.equal(INITIAL_MINT_AMOUNT);
    expect(await tokenB.balanceOf(otherAccount.address)).to.equal(
      INITIAL_MINT_AMOUNT
    );
  });

  it("Should fail to mint tokens because it is not the owner doing it", async function () {
    const { tokenA, tokenB, otherAccount } = await loadFixture(
      deploySimpleDexFixture
    );

    await expect(
      tokenA.connect(otherAccount).mint(otherAccount.address, 1000)
    ).to.be.revertedWithCustomError(tokenA, "OwnableUnauthorizedAccount");

    await expect(
      tokenB.connect(otherAccount).mint(otherAccount.address, 1000)
    ).to.be.revertedWithCustomError(tokenB, "OwnableUnauthorizedAccount");
  });
});
