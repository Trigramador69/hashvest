// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DevelopmentRegistry} from "../src/DevelopmentRegistry.sol";

contract DevelopmentRegistryTest is Test {
    function test_version() public {
        DevelopmentRegistry registry = new DevelopmentRegistry();

        assertEq(registry.version(), "0.1.0");
    }
}
