// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HashHelper {
    function hashAddress(address a) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(a));
    }
}
