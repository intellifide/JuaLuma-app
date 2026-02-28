package com.intellifide.jualuma.sharedcore

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

enum class MfaMethod(val wireValue: String) {
    TOTP("totp"),
    PASSKEY("passkey"),
}

data class MfaProof(
    val mfaCode: String? = null,
    val passkeyAssertion: JsonObject? = null,
)

interface MfaPasskeyGateway {
    suspend fun requestEmailCode(email: String): JsonObject
    suspend fun enableEmailCode(bearerToken: String, code: String): JsonObject
    suspend fun setupMfa(bearerToken: String, proof: MfaProof = MfaProof()): JsonObject
    suspend fun enableMfa(bearerToken: String, code: String): JsonObject
    suspend fun disableMfa(
        bearerToken: String,
        code: String? = null,
        passkeyAssertion: JsonObject? = null,
    ): JsonObject

    suspend fun setPrimaryMethod(
        bearerToken: String,
        method: MfaMethod,
        code: String? = null,
        passkeyAssertion: JsonObject? = null,
    ): JsonObject

    suspend fun setMethodLabel(
        bearerToken: String,
        method: MfaMethod,
        label: String,
        code: String? = null,
        passkeyAssertion: JsonObject? = null,
    ): JsonObject

    suspend fun requestPasskeyRegistrationOptions(
        bearerToken: String,
        proof: MfaProof = MfaProof(),
    ): JsonObject

    suspend fun verifyPasskeyRegistration(
        bearerToken: String,
        credential: JsonObject,
        mfaCode: String? = null,
        passkeyAssertion: JsonObject? = null,
    ): JsonObject

    suspend fun requestPasskeyAuthOptions(identityToken: String): JsonObject
}

class SharedMfaPasskeyApi(
    private val httpClient: HttpClient,
    private val config: MobileApiConfig,
) : MfaPasskeyGateway {
    override suspend fun requestEmailCode(email: String): JsonObject {
        return httpClient.post("${config.normalizedBaseUrl}/api/auth/mfa/email/request-code") {
            contentType(ContentType.Application.Json)
            setBody(buildJsonObject {
                put("email", email)
            })
        }.body()
    }

    override suspend fun enableEmailCode(bearerToken: String, code: String): JsonObject {
        return postAuthenticated(
            "/api/auth/mfa/email/enable",
            bearerToken,
            buildJsonObject {
                put("code", code)
            },
        )
    }

    override suspend fun setupMfa(bearerToken: String, proof: MfaProof): JsonObject {
        return postAuthenticated("/api/auth/mfa/setup", bearerToken, reauthPayload(proof))
    }

    override suspend fun enableMfa(bearerToken: String, code: String): JsonObject {
        return postAuthenticated("/api/auth/mfa/enable", bearerToken, buildJsonObject { put("code", code) })
    }

    override suspend fun disableMfa(
        bearerToken: String,
        code: String?,
        passkeyAssertion: JsonObject?,
    ): JsonObject {
        return postAuthenticated(
            "/api/auth/mfa/disable",
            bearerToken,
            buildJsonObject {
                code?.let { put("code", it) }
                passkeyAssertion?.let { put("passkey_assertion", it) }
            },
        )
    }

    override suspend fun setPrimaryMethod(
        bearerToken: String,
        method: MfaMethod,
        code: String?,
        passkeyAssertion: JsonObject?,
    ): JsonObject {
        return postAuthenticated(
            "/api/auth/mfa/primary",
            bearerToken,
            buildJsonObject {
                put("method", method.wireValue)
                code?.let { put("code", it) }
                passkeyAssertion?.let { put("passkey_assertion", it) }
            },
        )
    }

    override suspend fun setMethodLabel(
        bearerToken: String,
        method: MfaMethod,
        label: String,
        code: String?,
        passkeyAssertion: JsonObject?,
    ): JsonObject {
        return postAuthenticated(
            "/api/auth/mfa/label",
            bearerToken,
            buildJsonObject {
                put("method", method.wireValue)
                put("label", label)
                code?.let { put("code", it) }
                passkeyAssertion?.let { put("passkey_assertion", it) }
            },
        )
    }

    override suspend fun requestPasskeyRegistrationOptions(
        bearerToken: String,
        proof: MfaProof,
    ): JsonObject {
        return postAuthenticated("/api/auth/mfa/passkey/register/options", bearerToken, reauthPayload(proof))
    }

    override suspend fun verifyPasskeyRegistration(
        bearerToken: String,
        credential: JsonObject,
        mfaCode: String?,
        passkeyAssertion: JsonObject?,
    ): JsonObject {
        return postAuthenticated(
            "/api/auth/mfa/passkey/register/verify",
            bearerToken,
            buildJsonObject {
                put("credential", credential)
                mfaCode?.let { put("mfa_code", it) }
                passkeyAssertion?.let { put("passkey_assertion", it) }
            },
        )
    }

    override suspend fun requestPasskeyAuthOptions(identityToken: String): JsonObject {
        return httpClient.post("${config.normalizedBaseUrl}/api/auth/mfa/passkey/auth/options") {
            contentType(ContentType.Application.Json)
            setBody(buildJsonObject { put("token", identityToken) })
        }.body()
    }

    private fun reauthPayload(proof: MfaProof): JsonObject = buildJsonObject {
        proof.mfaCode?.let { put("mfa_code", it) }
        proof.passkeyAssertion?.let { put("passkey_assertion", it) }
    }

    private suspend fun postAuthenticated(path: String, bearerToken: String, body: JsonObject): JsonObject {
        return httpClient.post("${config.normalizedBaseUrl}$path") {
            contentType(ContentType.Application.Json)
            header("Authorization", "Bearer $bearerToken")
            setBody(body)
        }.body()
    }
}
