// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

enum UnlockStrategy {
    TIME,
    MILESTONE,
    HYBRID
}

struct GrantConfig {
    string title;
    address token;
    address beneficiary;
    address reviewer;
    uint256 totalAllocation;
    UnlockStrategy strategy;
    uint256 start;
    uint256 cliff;
    uint256 duration;
    address eligibilityProvider;
    bool revocable;
}

struct MilestoneInput {
    string title;
    uint256 amount;
}

struct Milestone {
    string title;
    uint256 amount;
    bool approved;
}
