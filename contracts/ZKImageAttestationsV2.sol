// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProviderRegistry.sol";
import "./IGroth16Verifier.sol";

contract ZKImageAttestations {
    error ModelInactiveOrUnknown();
    error PubKeyMismatch();
    error Replay();
    error InvalidProof();

    event Attested(
        bytes32 indexed attestationId,
        address indexed provider,
        string modelId,
        bytes32 imageCommitment,
        uint64 issuedAt,
        bytes32 nullifier
    );

    ProviderRegistry public immutable registry;
    IGroth16Verifier public immutable verifier;

    mapping(bytes32 => bool) public nullifierUsed;
    mapping(bytes32 => bool) public attestationExists;

    constructor(address registryAddress, address verifierAddress) {
        registry = ProviderRegistry(registryAddress);
        verifier = IGroth16Verifier(verifierAddress);
    }

    // ✅ 1. Input variables are passed SEPARATELY. No array in arguments.
    function submitAttestationSimple(
        address provider,
        bytes32 pubKeyHash,
        bytes32 imageCommitment,
        uint64 issuedAt,
        bytes32 nullifier,
        string calldata modelId
    ) external {
        
        // Dummy proof (Mock verifier returns true)
        uint256[2] memory a = [uint256(0), uint256(0)];
        uint256[2][2] memory b =
            [[uint256(0), uint256(0)], [uint256(0), uint256(0)]];
        uint256[2] memory c = [uint256(0), uint256(0)];

        // Pass variables directly
        _submitAttestationInternal(
            a, b, c, 
            provider, 
            pubKeyHash, 
            imageCommitment, 
            issuedAt, 
            nullifier, 
            modelId
        );
    }

    // ✅ 2. Internal function also takes SEPARATE variables.
    function _submitAttestationInternal(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        address provider,       // <-- Separate
        bytes32 pubKeyHash,     // <-- Separate
        bytes32 imageCommitment,// <-- Separate
        uint64 issuedAt,        // <-- Separate
        bytes32 nullifier,      // <-- Separate
        string memory modelId
    ) internal {
        // --- LOGIC CHECKS (Using separate variables) ---

        (bytes32 registeredKeyHash, bool active) =
            registry.getModel(provider, modelId);

        if (!active || registeredKeyHash == bytes32(0))
            revert ModelInactiveOrUnknown();

        if (registeredKeyHash != pubKeyHash)
            revert PubKeyMismatch();

        if (nullifierUsed[nullifier]) revert Replay();


        // --- VERIFIER CALL ---
        
        // We MUST construct a temporary array here because the 
        // IGroth16Verifier interface demands 'uint256[]'. 
        // This array exists ONLY for this one line.
        uint256[] memory pubSignals = new uint256[](5);
        pubSignals[0] = uint256(uint160(provider));
        pubSignals[1] = uint256(pubKeyHash);
        pubSignals[2] = uint256(imageCommitment);
        pubSignals[3] = uint256(issuedAt);
        pubSignals[4] = uint256(nullifier);

        // This works with MockGroth16Verifier as long as you passed the mock's address in constructor
        bool ok = verifier.verifyProof(a, b, c, pubSignals);
        
        if (!ok) revert InvalidProof();


        // --- STATE UPDATE ---
        
        nullifierUsed[nullifier] = true;

        bytes32 attestationId = keccak256(
            abi.encodePacked(
                provider,
                modelId,
                pubKeyHash,
                imageCommitment,
                issuedAt,
                nullifier
            )
        );
        attestationExists[attestationId] = true;

        emit Attested(
            attestationId,
            provider,
            modelId,
            imageCommitment,
            issuedAt,
            nullifier
        );
    }

    function isAttestedByNullifier(bytes32 nullifier)
        external
        view
        returns (bool)
    {
        return nullifierUsed[nullifier];
    }
}