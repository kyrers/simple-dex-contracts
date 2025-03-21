import { SimpleDex, TokenA, TokenB } from "../../typechain-types";
import { expect } from "chai";
import { ERC20Permit } from "../../typechain-types";
import { Signer } from "ethers";
import { ethers } from "ethers";

export function sqrt(value: bigint): bigint {
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (value / y + y) / 2n;
  }
  return x;
}

export async function getPermitSignature(
  token: ERC20Permit,
  owner: Signer,
  spender: string,
  value: bigint,
  deadline: bigint
): Promise<string> {
  const domain = {
    name: await token.name(),
    version: "1",
    chainId: 31337,
    verifyingContract: await token.getAddress(),
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    owner: await owner.getAddress(),
    spender,
    value,
    nonce: await token.nonces(await owner.getAddress()),
    deadline,
  };

  return owner.signTypedData(domain, types, message);
}

export async function addLiquidityWithPermit(
  simpleDex: SimpleDex,
  tokenA: TokenA,
  tokenB: TokenB,
  amountA: bigint,
  amountB: bigint,
  owner: Signer,
  deadline: bigint
) {
  const signatureA = await getPermitSignature(
    tokenA,
    owner,
    await simpleDex.getAddress(),
    amountA,
    deadline
  );
  const { v: vA, r: rA, s: sA } = ethers.Signature.from(signatureA);

  const signatureB = await getPermitSignature(
    tokenB,
    owner,
    await simpleDex.getAddress(),
    amountB,
    deadline
  );
  const { v: vB, r: rB, s: sB } = ethers.Signature.from(signatureB);
  const tx = await simpleDex.addLiquidityWithPermit(
    amountA,
    amountB,
    deadline,
    vA,
    rA,
    sA,
    deadline,
    vB,
    rB,
    sB
  );

  return tx;
}

export async function addLiquidity(
  simpleDex: SimpleDex,
  tokenA: TokenA,
  tokenB: TokenB,
  amountA: bigint,
  amountB: bigint
) {
  await tokenA.approve(simpleDex.target, amountA);
  await tokenB.approve(simpleDex.target, amountB);
  const tx = await simpleDex.addLiquidity(amountA, amountB);
  return tx;
}

interface StateVerificationParams {
  simpleDex: SimpleDex;
  tokenA?: TokenA;
  tokenB?: TokenB;
  accountAddress: string;
  expectedLpBalance?: bigint;
  expectedReserveA: bigint;
  expectedReserveB: bigint;
  expectedTotalLp?: bigint;
  expectedTokenABalance?: bigint;
  expectedTokenBBalance?: bigint;
  initialRatio?: bigint;
}

export async function verifyAddLiquidityState(params: StateVerificationParams) {
  const {
    simpleDex,
    accountAddress,
    expectedLpBalance,
    expectedReserveA,
    expectedReserveB,
    expectedTotalLp,
  } = params;

  expect(await simpleDex.reserveA()).to.equal(expectedReserveA);
  expect(await simpleDex.reserveB()).to.equal(expectedReserveB);
  expect(await simpleDex.totalLpTokens()).to.equal(expectedTotalLp);
  expect(await simpleDex.lpBalances(accountAddress)).to.equal(
    expectedLpBalance
  );
}

export async function verifyRemoveLiquidityState(
  params: StateVerificationParams
) {
  const {
    simpleDex,
    accountAddress,
    tokenA,
    tokenB,
    expectedLpBalance,
    expectedReserveA,
    expectedReserveB,
    expectedTotalLp,
    expectedTokenABalance,
    expectedTokenBBalance,
  } = params;

  expect(await simpleDex.lpBalances(accountAddress)).to.equal(
    expectedLpBalance
  );
  expect(await simpleDex.reserveA()).to.equal(expectedReserveA);
  expect(await simpleDex.reserveB()).to.equal(expectedReserveB);
  expect(await simpleDex.totalLpTokens()).to.equal(expectedTotalLp);
  expect(await tokenA?.balanceOf(accountAddress)).to.equal(
    expectedTokenABalance
  );
  expect(await tokenB?.balanceOf(accountAddress)).to.equal(
    expectedTokenBBalance
  );
}

export async function verifySwapState(params: StateVerificationParams) {
  const {
    simpleDex,
    tokenA,
    tokenB,
    accountAddress,
    expectedReserveA,
    expectedReserveB,
    expectedTokenABalance,
    expectedTokenBBalance,
    initialRatio,
  } = params;

  expect(await simpleDex.reserveA()).to.equal(expectedReserveA);
  expect(await simpleDex.reserveB()).to.equal(expectedReserveB);
  expect(await tokenA?.balanceOf(accountAddress)).to.equal(
    expectedTokenABalance
  );
  expect(await tokenB?.balanceOf(accountAddress)).to.equal(
    expectedTokenBBalance
  );

  // Verify constant ratio (with 0.5% tolerance)
  const product = expectedReserveA * expectedReserveB;
  const tolerance = (initialRatio! * 5n) / 1000n;
  expect(product).to.be.closeTo(initialRatio, tolerance);
}
