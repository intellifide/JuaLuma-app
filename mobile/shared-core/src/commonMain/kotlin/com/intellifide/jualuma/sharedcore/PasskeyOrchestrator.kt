package com.intellifide.jualuma.sharedcore

import kotlinx.serialization.json.JsonObject

interface PasskeyPlatformGateway {
    suspend fun createCredential(registrationOptions: JsonObject): JsonObject
    suspend fun createAssertion(authOptions: JsonObject): JsonObject
}

class PasskeyOrchestrator(
    private val mfaGateway: MfaPasskeyGateway,
    private val passkeyGateway: PasskeyPlatformGateway,
) {
    suspend fun registerPasskey(
        bearerToken: String,
        proof: MfaProof = MfaProof(),
    ): JsonObject {
        val options = mfaGateway.requestPasskeyRegistrationOptions(bearerToken, proof)
        val credential = passkeyGateway.createCredential(options)
        return mfaGateway.verifyPasskeyRegistration(
            bearerToken = bearerToken,
            credential = credential,
            mfaCode = proof.mfaCode,
            passkeyAssertion = proof.passkeyAssertion,
        )
    }

    suspend fun buildPasskeyAssertion(identityToken: String): JsonObject {
        val options = mfaGateway.requestPasskeyAuthOptions(identityToken)
        return passkeyGateway.createAssertion(options)
    }
}
