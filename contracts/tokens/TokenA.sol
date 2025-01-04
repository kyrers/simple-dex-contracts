// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TokenA is ERC20, ERC20Permit, Ownable {
    constructor(
        address initialOwner
    ) ERC20("TokenA", "TKA") ERC20Permit("TokenA") Ownable(initialOwner) {}
}
