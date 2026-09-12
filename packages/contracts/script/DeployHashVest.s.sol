// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {HashVestFactory} from "../src/HashVestFactory.sol";
import {DemoToken} from "../src/DemoToken.sol";
import {DemoEligibilityProvider} from "../src/DemoEligibilityProvider.sol";

/// @notice HSK Testnet-only deployment. Never broadcast this script to mainnet.
contract DeployHashVest is Script {
    error WrongChain();

    function run()
        external
        returns (HashVestFactory factory, DemoToken demoToken, DemoEligibilityProvider eligibilityProvider)
    {
        // Check the actual execution network before reading any signing material.
        if (block.chainid != 133) revert WrongChain();
        uint256 deployerPrivateKey;
        try vm.envUint("DEPLOYER_PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            string memory rawKey = vm.envString("DEPLOYER_PRIVATE_KEY");
            deployerPrivateKey = vm.parseUint(string.concat("0x", rawKey));
        }
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        factory = new HashVestFactory();
        demoToken = new DemoToken(deployer);
        eligibilityProvider = new DemoEligibilityProvider(deployer);
        vm.stopBroadcast();

        console2.log("HSK Testnet chain ID:", block.chainid);
        console2.log("HashVestFactory:", address(factory));
        console2.log("DemoToken (hvUSD):", address(demoToken));
        console2.log("DemoEligibilityProvider:", address(eligibilityProvider));
    }
}
