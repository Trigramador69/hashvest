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

    function test_demoTokenFaucetCannotMintAfterChainChangesToMainnet() public {
        vm.chainId(133);
        DemoToken token = new DemoToken(address(this));
        vm.chainId(177);
        vm.expectRevert(DemoToken.DemoNetworkOnly.selector);
        token.faucet();
    }

    function test_demoTokenSupportsLocalAnvil() public {
        vm.chainId(31337);
        DemoToken token = new DemoToken(address(this));
        assertEq(token.balanceOf(address(this)), 1_000_000 ether);
    }

    function testFuzz_deployScriptRejectsEveryOtherChain(uint64 chainId) public {
        vm.assume(chainId != 133);
        vm.chainId(chainId);
        DeployHashVest script = new DeployHashVest();
        vm.expectRevert(DeployHashVest.WrongChain.selector);
        script.run();
    }
}
