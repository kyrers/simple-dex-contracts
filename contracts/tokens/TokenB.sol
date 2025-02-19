// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title A simple token to be used for **testing only**
 * @author kyrers
 * @notice Anyone can mint tokens to themselves
 */
contract TokenB is ERC20, ERC20Permit {
    constructor() ERC20("TokenB", "TKB") ERC20Permit("TokenB") {}

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
