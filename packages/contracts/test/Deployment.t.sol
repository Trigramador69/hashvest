// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DemoToken} from "../src/DemoToken.sol";
import {DeployHashVest} from "../script/DeployHashVest.s.sol";

contract DeploymentTest is Test {
    function test_demoTokenDistributesTestSupplyAndProvidesExplicitFaucet() public {
        vm.chainId(133);
        address deployer = makeAddr("deployer");
        DemoToken token = new DemoToken(deployer);
        assertEq(token.name(), "HashVest Demo USD");
        assertEq(token.symbol(), "hvUSD");
        assertEq(token.decimals(), 18);
        assertEq(token.balanceOf(deployer), 1_000_000 ether);
        address demoUser = makeAddr("demoUser");
        vm.prank(demoUser);
        token.faucet();
        assertEq(token.balanceOf(demoUser), 1_000 ether);
    }

    function test_deployScriptRejectsMainnetBeforeAccessingPrivateKey() public {
        vm.chainId(177);
        DeployHashVest script = new DeployHashVest();
        vm.expectRevert(DeployHashVest.WrongChain.selector);
        script.run();
    }

    function test_demoTokenCannotDeployOnMainnet() public {
        vm.chainId(177);
        vm.expectRevert(DemoToken.DemoNetworkOnly.selector);
        new DemoToken(address(this));
    }
}
