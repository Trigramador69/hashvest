// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {DevelopmentRegistry} from "../src/DevelopmentRegistry.sol";

contract DeployDevelopmentRegistry is Script {
    function run() external returns (DevelopmentRegistry deployed) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        deployed = new DevelopmentRegistry();
        vm.stopBroadcast();
    }
}
