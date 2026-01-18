// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProviderRegistry.sol";

contract ImageAttestationRegistry {
    // Custom errors for gas efficiency
    error NotRegisteredProvider();
    error AttestationAlreadyExists();
    error ModelInactive();

    struct AttestationData {
        address provider;
        string modelId;
        uint64 issuedAt;
        // You can add 'string metadata' or 'string ipfsHash' here if needed
    }

    event AttestationRegistered(
        bytes32 indexed imageCommitment,
        address indexed provider,
        string modelId,
        uint64 issuedAt
    );

    ProviderRegistry public immutable registry;

    // KEY: Image Commitment (Hash) -> VALUE: Attestation Details
    mapping(bytes32 => AttestationData) public attestations;

    constructor(address registryAddress) {
        registry = ProviderRegistry(registryAddress);
    }

    /**
     * @notice Registers an image commitment on-chain.
     * @param imageCommitment The hash of the generated image (computed off-chain).
     * @param modelId The ID of the model used (must be registered to msg.sender).
     */
    function registerAttestation(
        bytes32 imageCommitment,
        string calldata modelId
    ) external {
        // 1. Validate that the image hasn't been attested before
        if (attestations[imageCommitment].issuedAt != 0) {
            revert AttestationAlreadyExists();
        }

        // 2. Validate that msg.sender is a valid provider for this model
        // We assume your Registry returns (bytes32 key, bool active)
        (, bool active) = registry.getModel(msg.sender, modelId);
        
        if (!active) {
            revert NotRegisteredProvider();
        }

        // 3. Store the attestation
        // Note: msg.sender acts as the signature/proof of origin
        attestations[imageCommitment] = AttestationData({
            provider: msg.sender,
            modelId: modelId,
            issuedAt: uint64(block.timestamp)
        });

        // 4. Emit event for indexers
        emit AttestationRegistered(
            imageCommitment,
            msg.sender,
            modelId,
            uint64(block.timestamp)
        );
    }

    /**
     * @notice Verify an image by its hash.
     * @return provider The address of the creator (address(0) if invalid).
     */
    function verifyImage(bytes32 imageCommitment) 
        external 
        view 
        returns (address provider, string memory modelId, uint64 issuedAt) 
    {
        AttestationData memory data = attestations[imageCommitment];
        return (data.provider, data.modelId, data.issuedAt);
    }
}