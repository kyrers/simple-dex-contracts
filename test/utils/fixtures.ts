import { ethers } from "hardhat";
import { INITIAL_MINT_AMOUNT } from "./constants";

export async function deploySimpleDexFixture() {
  const [owner, otherAccount] = await ethers.getSigners();

  //Deploy contracts
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();

  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();

  const SimpleDex = await ethers.getContractFactory("SimpleDex");
  const simpleDex = await SimpleDex.deploy(tokenA.target, tokenB.target);

  //Mint tokens to users
  await tokenA.mint(INITIAL_MINT_AMOUNT);
  await tokenA.connect(otherAccount).mint(INITIAL_MINT_AMOUNT);
  await tokenB.mint(INITIAL_MINT_AMOUNT);
  await tokenB.connect(otherAccount).mint(INITIAL_MINT_AMOUNT);

  return {
    tokenA,
    tokenB,
    simpleDex,
    owner,
    otherAccount,
  };
}
