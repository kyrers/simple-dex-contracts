// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleDex is ReentrancyGuard {
    IERC20 public tokenA;
    IERC20 public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalLpTokens;
    mapping(address => uint256) public lpBalances;

    event Swap(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        address indexed tokenOut,
        uint256 amountOut
    );
    event AddLiquidity(address indexed user, uint256 amountA, uint256 amountB);
    event RemoveLiquidity(
        address indexed user,
        uint256 amountA,
        uint256 amountB
    );

    error InvalidTokenAddress(address tokenA, address tokenB);
    error InvalidTokenAmount(uint256 amountA, uint256 amountB);
    error InvalidTokenRatio(uint256 amountB, uint256 expectedAmountB);

    modifier validTokenAmounts(uint256 amountA, uint256 amountB) {
        if (amountA <= 0 || amountB <= 0) {
            revert InvalidTokenAmount(amountA, amountB);
        }
        _;
    }

    constructor(IERC20 _tokenA, IERC20 _tokenB) {
        if (address(_tokenA) == address(0) || address(_tokenB) == address(0)) {
            revert InvalidTokenAddress(address(_tokenA), address(_tokenB));
        }

        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external validTokenAmounts(amountA, amountB) nonReentrant {
        uint256 lpTokensMinted;

        if (totalLpTokens == 0) {
            // Initial liquidity
            lpTokensMinted = sqrt(amountA * amountB);
        } else {
            // Enforce ratio
            uint256 expectedAmountB = (amountA * reserveB) / reserveA;
            if (amountB != expectedAmountB) {
                revert InvalidTokenRatio(amountB, expectedAmountB);
            }

            lpTokensMinted = (amountA * totalLpTokens) / reserveA;
        }

        reserveA += amountA;
        reserveB += amountB;
        totalLpTokens += lpTokensMinted;
        lpBalances[msg.sender] += lpTokensMinted;

        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        emit AddLiquidity(msg.sender, amountA, amountB);
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    // function removeLiquidity(uint256 amountA, uint256 amountB) external {
    //     require(amountA > 0 && amountB > 0, "Invalid amounts");
    //     require(
    //         amountA <= reserveA && amountB <= reserveB,
    //         "Insufficient liquidity"
    //     );

    //     reserveA -= amountA;
    //     reserveB -= amountB;

    //     tokenA.transfer(msg.sender, amountA);
    //     tokenB.transfer(msg.sender, amountB);

    //     emit RemoveLiquidity(msg.sender, amountA, amountB);
    // }

    // function swap(address tokenIn, uint256 amountIn) external {
    //     require(amountIn > 0, "Invalid amount");

    //     if (tokenIn == address(tokenA)) {
    //         uint256 amountOut = getAmountOut(amountIn, reserveA, reserveB);
    //         require(
    //             amountOut > 0 && amountOut <= reserveB,
    //             "Insufficient liquidity"
    //         );

    //         tokenA.transferFrom(msg.sender, address(this), amountIn);
    //         tokenB.transfer(msg.sender, amountOut);

    //         reserveA += amountIn;
    //         reserveB -= amountOut;

    //         emit Swap(
    //             msg.sender,
    //             tokenIn,
    //             amountIn,
    //             address(tokenB),
    //             amountOut
    //         );
    //     } else if (tokenIn == address(tokenB)) {
    //         uint256 amountOut = getAmountOut(amountIn, reserveB, reserveA);
    //         require(
    //             amountOut > 0 && amountOut <= reserveA,
    //             "Insufficient liquidity"
    //         );

    //         tokenB.transferFrom(msg.sender, address(this), amountIn);
    //         tokenA.transfer(msg.sender, amountOut);

    //         reserveB += amountIn;
    //         reserveA -= amountOut;

    //         emit Swap(
    //             msg.sender,
    //             tokenIn,
    //             amountIn,
    //             address(tokenA),
    //             amountOut
    //         );
    //     } else {
    //         revert("Invalid token");
    //     }
    // }

    // function getAmountOut(
    //     uint256 amountIn,
    //     uint256 reserveIn,
    //     uint256 reserveOut
    // ) public pure returns (uint256) {
    //     uint256 amountInWithFee = amountIn * 997;
    //     uint256 numerator = amountInWithFee * reserveOut;
    //     uint256 denominator = (reserveIn * 1000) + amountInWithFee;
    //     return numerator / denominator;
    // }
}
