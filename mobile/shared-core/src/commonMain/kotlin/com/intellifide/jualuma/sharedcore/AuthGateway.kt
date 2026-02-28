package com.intellifide.jualuma.sharedcore

import kotlinx.serialization.json.JsonObject

interface AuthGateway {
    suspend fun login(
        identityToken: String,
        mfaCode: String? = null,
        passkeyAssertion: JsonObject? = null,
    ): JsonObject
}
