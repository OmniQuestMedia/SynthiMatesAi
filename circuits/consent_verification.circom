pragma circom 2.1.0;

template ConsentVerification() {
    // Public signals
    signal input consentHash;
    signal input characterId;
    signal input timestamp;
    
    // Private witness (secret)
    signal input secretSalt;
    signal input accountIdHash;
    
    // Verify that consentHash was computed correctly
    signal computedHash;
    computedHash <== Poseidon(4)([accountIdHash, characterId, timestamp, secretSalt]);
    
    // Enforce equality
    computedHash === consentHash;
    
    // Output public signals for verification
    signal output outConsentHash <== consentHash;
    signal output outCharacterId <== characterId;
    signal output outTimestamp <== timestamp;
}

component main {public [consentHash, characterId, timestamp]} = ConsentVerification();
