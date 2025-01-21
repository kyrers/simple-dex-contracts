import { SimpleDex, TokenA, TokenB } from "../../typechain-types";
import { expect } from "chai";

export function sqrt(value: bigint): bigint {
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (value / y + y) / 2n;
  }
  return x;
}

export async function addInitialLiquidity(
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

interface LiquidityStateParams {
  expectedLpBalance: bigint;
  expectedReserveA: bigint;
  expectedReserveB: bigint;
  expectedTotalLp: bigint;
  expectedTokenABalance?: bigint;
  expectedTokenBBalance?: bigint;
}

export async function verifyAddLiquidityState(
  simpleDex: SimpleDex,
  accountAddress: string,
  params: LiquidityStateParams
) {
  const {
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
  simpleDex: SimpleDex,
  tokenA: TokenA,
  tokenB: TokenB,
  accountAddress: string,
  params: LiquidityStateParams
) {
  const {
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
  expect(await tokenA.balanceOf(accountAddress)).to.equal(
    expectedTokenABalance
  );
  expect(await tokenB.balanceOf(accountAddress)).to.equal(
    expectedTokenBBalance
  );
}
