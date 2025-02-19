import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deploySimpleDexFixture } from "../utils/fixtures";
import { INITIAL_MINT_AMOUNT } from "../utils/constants";

describe("# TOKEN DEPLOYMENT #", function () {
  it("Should deploy TokenA and TokenB successfully", async function () {
    const { tokenA, tokenB } = await loadFixture(deploySimpleDexFixture);

    expect(await tokenA.name()).to.equal("TokenA");
    expect(await tokenA.symbol()).to.equal("TKA");
    expect(await tokenB.name()).to.equal("TokenB");
    expect(await tokenB.symbol()).to.equal("TKB");
  });

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
});
