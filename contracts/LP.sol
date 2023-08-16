// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LP is ERC20 {
    constructor() ERC20("LP", "LP") {
        _mint(msg.sender, 210000000 ether);
    }
}
