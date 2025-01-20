import { ethers } from "hardhat";
import { INITIAL_MINT_AMOUNT } from "./constants";

export async function deploySimpleDexFixture() {
  const [owner, otherAccount] = await ethers.getSigners();

  //Deploy contracts
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy(owner.address);

  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy(owner.address);

  const SimpleDex = await ethers.getContractFactory("SimpleDex");
  const simpleDex = await SimpleDex.deploy(tokenA.target, tokenB.target);

  //Mint tokens to users
  await tokenA.mint(owner.address, INITIAL_MINT_AMOUNT);
  await tokenA.mint(otherAccount.address, INITIAL_MINT_AMOUNT);
  await tokenB.mint(owner.address, INITIAL_MINT_AMOUNT);
  await tokenB.mint(otherAccount.address, INITIAL_MINT_AMOUNT);

  return {
    tokenA,
    tokenB,
    simpleDex,
    owner,
    otherAccount,
  };
}
