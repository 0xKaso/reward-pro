// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

contract IRewardDistributionRecipient is Ownable {
    modifier onlyRewardDistribution() {
        require(
            _msgSender() == address(this) || _msgSender() == owner(),
            "Caller is not reward distribution or owner"
        );
        _;
    }
}
