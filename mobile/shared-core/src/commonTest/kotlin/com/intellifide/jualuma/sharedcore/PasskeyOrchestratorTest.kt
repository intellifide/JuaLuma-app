package com.intellifide.jualuma.sharedcore

import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals

class PasskeyOrchestratorTest {
    @Test
    fun `registerPasskey requests options then verifies generated credential`() = runBlocking {
        var verifyCredential: JsonObject? = null
        var verifyCode: String? = null

        val mfaGateway = object : MfaPasskeyGateway {
            override suspend fun requestEmailCode(email: String): JsonObject = json("message", "unused")
            override suspend fun enableEmailCode(bearerToken: String, code: String): JsonObject = json("message", "unused")
            override suspend fun setupMfa(bearerToken: String, proof: MfaProof): JsonObject = json("message", "unused")
            override suspend fun enableMfa(bearerToken: String, code: String): JsonObject = json("message", "unused")
            override suspend fun disableMfa(
                bearerToken: String,
                code: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject = json("message", "unused")

            override suspend fun setPrimaryMethod(
                bearerToken: String,
                method: MfaMethod,
                code: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject = json("message", "unused")

            override suspend fun setMethodLabel(
                bearerToken: String,
                method: MfaMethod,
                label: String,
                code: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject = json("message", "unused")

            override suspend fun requestPasskeyRegistrationOptions(
                bearerToken: String,
                proof: MfaProof,
            ): JsonObject = json("challenge", "challenge-1")

            override suspend fun verifyPasskeyRegistration(
                bearerToken: String,
                credential: JsonObject,
                mfaCode: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject {
                verifyCredential = credential
                verifyCode = mfaCode
                return json("message", "Passkey MFA enabled.")
            }

            override suspend fun requestPasskeyAuthOptions(identityToken: String): JsonObject = json("challenge", "auth-1")
        }

        val passkeyGateway = object : PasskeyPlatformGateway {
            override suspend fun createCredential(registrationOptions: JsonObject): JsonObject {
                assertEquals("challenge-1", registrationOptions["challenge"]?.jsonPrimitive?.content)
                return json("rawId", "credential-1")
            }

            override suspend fun createAssertion(authOptions: JsonObject): JsonObject = json("id", "assertion-1")
        }

        val orchestrator = PasskeyOrchestrator(mfaGateway, passkeyGateway)
        val response = orchestrator.registerPasskey("bearer", MfaProof(mfaCode = "123456"))

        assertEquals("Passkey MFA enabled.", response["message"]?.jsonPrimitive?.content)
        assertEquals("credential-1", verifyCredential?.get("rawId")?.jsonPrimitive?.content)
        assertEquals("123456", verifyCode)
    }

    @Test
    fun `buildPasskeyAssertion requests auth options and returns assertion`() = runBlocking {
        val mfaGateway = object : MfaPasskeyGateway {
            override suspend fun requestEmailCode(email: String): JsonObject = json("message", "unused")
            override suspend fun enableEmailCode(bearerToken: String, code: String): JsonObject = json("message", "unused")
            override suspend fun setupMfa(bearerToken: String, proof: MfaProof): JsonObject = json("message", "unused")
            override suspend fun enableMfa(bearerToken: String, code: String): JsonObject = json("message", "unused")
            override suspend fun disableMfa(
                bearerToken: String,
                code: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject = json("message", "unused")

            override suspend fun setPrimaryMethod(
                bearerToken: String,
                method: MfaMethod,
                code: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject = json("message", "unused")

            override suspend fun setMethodLabel(
                bearerToken: String,
                method: MfaMethod,
                label: String,
                code: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject = json("message", "unused")

            override suspend fun requestPasskeyRegistrationOptions(
                bearerToken: String,
                proof: MfaProof,
            ): JsonObject = json("message", "unused")

            override suspend fun verifyPasskeyRegistration(
                bearerToken: String,
                credential: JsonObject,
                mfaCode: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject = json("message", "unused")

            override suspend fun requestPasskeyAuthOptions(identityToken: String): JsonObject {
                assertEquals("identity-token", identityToken)
                return json("challenge", "auth-challenge")
            }
        }

        val passkeyGateway = object : PasskeyPlatformGateway {
            override suspend fun createCredential(registrationOptions: JsonObject): JsonObject = json("message", "unused")

            override suspend fun createAssertion(authOptions: JsonObject): JsonObject {
                assertEquals("auth-challenge", authOptions["challenge"]?.jsonPrimitive?.content)
                return json("id", "assertion-1")
            }
        }

        val orchestrator = PasskeyOrchestrator(mfaGateway, passkeyGateway)
        val assertion = orchestrator.buildPasskeyAssertion("identity-token")

        assertEquals("assertion-1", assertion["id"]?.jsonPrimitive?.content)
    }

    private fun json(key: String, value: String): JsonObject = buildJsonObject {
        put(key, JsonPrimitive(value))
    }
}
