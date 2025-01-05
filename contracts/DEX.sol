// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleDEX {
    IERC20 public tokenA;
    IERC20 public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;

    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, address indexed tokenOut, uint256 amountOut);
    event AddLiquidity(address indexed user, uint256 amountA, uint256 amountB);
    event RemoveLiquidity(address indexed user, uint256 amountA, uint256 amountB);

    constructor(IERC20 _tokenA, IERC20 _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external {
        require(amountA > 0 && amountB > 0, "Invalid amounts");

        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        reserveA += amountA;
        reserveB += amountB;

        emit AddLiquidity(msg.sender, amountA, amountB);
    }

    function removeLiquidity(uint256 amountA, uint256 amountB) external {
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        require(amountA <= reserveA && amountB <= reserveB, "Insufficient liquidity");

        reserveA -= amountA;
        reserveB -= amountB;

        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);

        emit RemoveLiquidity(msg.sender, amountA, amountB);
    }

    function swap(address tokenIn, uint256 amountIn) external {
        require(amountIn > 0, "Invalid amount");

        if (tokenIn == address(tokenA)) {
            uint256 amountOut = getAmountOut(amountIn, reserveA, reserveB);
            require(amountOut > 0 && amountOut <= reserveB, "Insufficient liquidity");

            tokenA.transferFrom(msg.sender, address(this), amountIn);
            tokenB.transfer(msg.sender, amountOut);

            reserveA += amountIn;
            reserveB -= amountOut;

            emit Swap(msg.sender, tokenIn, amountIn, address(tokenB), amountOut);
        } else if (tokenIn == address(tokenB)) {
            uint256 amountOut = getAmountOut(amountIn, reserveB, reserveA);
            require(amountOut > 0 && amountOut <= reserveA, "Insufficient liquidity");

            tokenB.transferFrom(msg.sender, address(this), amountIn);
            tokenA.transfer(msg.sender, amountOut);

            reserveB += amountIn;
            reserveA -= amountOut;

            emit Swap(msg.sender, tokenIn, amountIn, address(tokenA), amountOut);
        } else {
            revert("Invalid token");
        }
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }
}