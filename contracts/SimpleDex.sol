// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Simple Dex
 * @author kyrers
 * @notice A simple dex that uses Tokens A and B, allow users to add or remove liquidity and swap between tokens. Fee on swaps is 0.3%.
 */
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

    error InsufficientLiquidity();
    error InsufficientLpTokens();
    error InvalidBurnAmount(uint256 lpTokensToBurn);
    error InvalidSwapAmount(uint256 amount);
    error InvalidToken(address token);
    error InvalidTokenAddress(address tokenA, address tokenB);
    error InvalidTokenAmount(uint256 amountA, uint256 amountB);
    error InvalidTokenRatio(uint256 amountB, uint256 expectedAmountB);

    constructor(IERC20 _tokenA, IERC20 _tokenB) {
        if (address(_tokenA) == address(0) || address(_tokenB) == address(0)) {
            revert InvalidTokenAddress(address(_tokenA), address(_tokenB));
        }

        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    /**
     * @notice Add liquidity to the swap.
     * @dev The first user to add liquidity sets the ratio. Subsequent users are forced to keep the ratio.
     * @param amountA The amount of A tokens to add
     * @param amountB The amount of B tokens to add
     */
    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant {
        _addLiquidity(amountA, amountB);
    }

    /**
     * @notice Add liquidity to the swap using ERC20Permit.
     * @dev Same as addLiquidity but uses permit to approve in the same transaction
     * @param amountA The amount of A tokens to add
     * @param amountB The amount of B tokens to add
     * @param deadlineA The deadline for tokenA permit
     * @param vA The v parameter for tokenA permit
     * @param rA The r parameter for tokenA permit
     * @param sA The s parameter for tokenA permit
     * @param deadlineB The deadline for tokenB permit
     * @param vB The v parameter for tokenB permit
     * @param rB The r parameter for tokenB permit
     * @param sB The s parameter for tokenB permit
     */
    function addLiquidityWithPermit(
        uint256 amountA,
        uint256 amountB,
        uint256 deadlineA,
        uint8 vA,
        bytes32 rA,
        bytes32 sA,
        uint256 deadlineB,
        uint8 vB,
        bytes32 rB,
        bytes32 sB
    ) external nonReentrant {
        IERC20Permit(address(tokenA)).permit(
            msg.sender,
            address(this),
            amountA,
            deadlineA,
            vA,
            rA,
            sA
        );

        IERC20Permit(address(tokenB)).permit(
            msg.sender,
            address(this),
            amountB,
            deadlineB,
            vB,
            rB,
            sB
        );

        _addLiquidity(amountA, amountB);
    }

    /**
     * @notice Swap between Token A and B. Constant 0.3% fee.
     * @param tokenIn The token to swap
     * @param amountIn The amount to swap
     */
    function swap(address tokenIn, uint256 amountIn) external nonReentrant {
        _swap(tokenIn, amountIn);
    }

    /**
     * @notice Swap between Token A and B using ERC20Permit.
     * @dev Same as swap but uses permit to approve in the same transaction
     * @param tokenIn The token to swap
     * @param amountIn The amount to swap
     * @param deadline The deadline for the permit
     * @param v The v parameter for the permit
     * @param r The r parameter for the permit
     * @param s The s parameter for the permit
     */
    function swapWithPermit(
        address tokenIn,
        uint256 amountIn,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        IERC20Permit(tokenIn).permit(
            msg.sender,
            address(this),
            amountIn,
            deadline,
            v,
            r,
            s
        );

        _swap(tokenIn, amountIn);
    }

    /**
     * @notice Allows LPs to remove total or partial liquidity provided.
     * @param lpTokensToBurn The amount of liquidity tokens to burn
     */
    function removeLiquidity(uint256 lpTokensToBurn) external nonReentrant {
        if (lpTokensToBurn <= 0) {
            revert InvalidBurnAmount(lpTokensToBurn);
        }

        if (lpBalances[msg.sender] < lpTokensToBurn) {
            revert InsufficientLpTokens();
        }

        uint256 amountA = (lpTokensToBurn * reserveA) / totalLpTokens;
        uint256 amountB = (lpTokensToBurn * reserveB) / totalLpTokens;

        reserveA -= amountA;
        reserveB -= amountB;
        totalLpTokens -= lpTokensToBurn;
        lpBalances[msg.sender] -= lpTokensToBurn;

        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);

        emit RemoveLiquidity(msg.sender, amountA, amountB);
    }

    /**
     * @notice Calculates the amount of tokens to send to an user during a swap in order to keep the constant ratio.
     * @param amountIn The amount of Token A or B sent
     * @param reserveIn The reserves of the token sent
     * @param reserveOut The reserves of the token to send
     * @return Tokens to send to the user
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }

    function _addLiquidity(uint256 amountA, uint256 amountB) internal {
        if (amountA <= 0 || amountB <= 0) {
            revert InvalidTokenAmount(amountA, amountB);
        }

        uint256 lpTokensMinted;

        if (totalLpTokens == 0) {
            lpTokensMinted = sqrt(amountA * amountB);
        } else {
            uint256 expectedAmountB = (amountA * reserveB) / reserveA;
            //Allow for 0.1% tolerance in the ratio to account for rounding differences
            uint256 tolerance = expectedAmountB / 1000;
            if (amountB < expectedAmountB - tolerance || amountB > expectedAmountB + tolerance) {
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

    function _swap(address tokenIn, uint256 amountIn) internal {
        if (amountIn <= 0) {
            revert InvalidSwapAmount(amountIn);
        }

        if (address(tokenA) != tokenIn && address(tokenB) != tokenIn) {
            revert InvalidToken(tokenIn);
        }

        (
            bool isTokenA,
            IERC20 inToken,
            IERC20 outToken,
            uint256 reserveIn,
            uint256 reserveOut
        ) = tokenIn == address(tokenA)
                ? (true, tokenA, tokenB, reserveA, reserveB)
                : (false, tokenB, tokenA, reserveB, reserveA);

        uint256 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut <= 0 || amountOut > reserveOut) {
            revert InsufficientLiquidity();
        }

        if (isTokenA) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }

        inToken.transferFrom(msg.sender, address(this), amountIn);
        outToken.transfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, amountIn, address(outToken), amountOut);
    }

    /**
     * @notice Calculates the square root of a number
     * @dev Used to calculate initial LP tokens when first adding liquidity
     * @param x The number to calculate the square root of
     * @return y The square root of x
     */
    function sqrt(uint256 x) private pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
