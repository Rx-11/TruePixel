// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProviderRegistry {
    error NotProvider();
    error ModelAlreadyRegistered();
    error ModelNotRegistered();

    event ProviderRegistered(address indexed provider);
    event ModelRegistered(address indexed provider, string modelId, bytes32 pubKeyHash);
    event ModelRevoked(address indexed provider, string modelId);

    struct ModelInfo {
        bytes32 pubKeyHash;
        bool active;
    }

    mapping(address => bool) public isProvider;
    mapping(address => mapping(string => ModelInfo)) private models;

    function registerProvider() external {
        isProvider[msg.sender] = true;
        emit ProviderRegistered(msg.sender);
    }

    function registerModel(string calldata modelId, bytes32 pubKeyHash) external {
        if (!isProvider[msg.sender]) revert NotProvider();

        ModelInfo storage m = models[msg.sender][modelId];
        if (m.pubKeyHash != bytes32(0)) revert ModelAlreadyRegistered();

        m.pubKeyHash = pubKeyHash;
        m.active = true;

        emit ModelRegistered(msg.sender, modelId, pubKeyHash);
    }

    function revokeModel(string calldata modelId) external {
        if (!isProvider[msg.sender]) revert NotProvider();

        ModelInfo storage m = models[msg.sender][modelId];
        if (m.pubKeyHash == bytes32(0)) revert ModelNotRegistered();

        m.active = false;
        emit ModelRevoked(msg.sender, modelId);
    }

    function getModel(
        address provider,
        string calldata modelId
    ) external view returns (bytes32 pubKeyHash, bool active) {
        ModelInfo memory m = models[provider][modelId];
        return (m.pubKeyHash, m.active);
    }
}
