// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Testnet demonstration asset with unrestricted fixed-amount faucet minting.
/// @dev No monetary value. Never use this token as a production asset.
contract DemoToken is ERC20 {
    error DemoNetworkOnly();

    uint256 public constant FAUCET_AMOUNT = 1_000 ether;

    constructor(address recipient) ERC20("HashVest Demo USD", "hvUSD") {
        _requireDemoNetwork();
        _mint(recipient, 1_000_000 ether);
    }

    /// @notice Anyone can mint 1,000 demo hvUSD per call on HSK Testnet or local Anvil.
    function faucet() external {
        _requireDemoNetwork();
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function _requireDemoNetwork() private view {
        if (block.chainid != 133 && block.chainid != 31337) revert DemoNetworkOnly();
    }
}
