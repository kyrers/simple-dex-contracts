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

interface BaseLiquidityStateParams {
  simpleDex: SimpleDex;
  accountAddress: string;
  expectedLpBalance: bigint;
  expectedReserveA: bigint;
  expectedReserveB: bigint;
  expectedTotalLp: bigint;
  expectedTokenABalance?: bigint;
  expectedTokenBBalance?: bigint;
}

export async function verifyAddLiquidityState(
  params: BaseLiquidityStateParams
) {
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

interface RemoveLiquidityStateParams extends BaseLiquidityStateParams {
  tokenA: TokenA;
  tokenB: TokenB;
}

export async function verifyRemoveLiquidityState(
  params: RemoveLiquidityStateParams
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
  expect(await tokenA.balanceOf(accountAddress)).to.equal(
    expectedTokenABalance
  );
  expect(await tokenB.balanceOf(accountAddress)).to.equal(
    expectedTokenBBalance
  );
}
