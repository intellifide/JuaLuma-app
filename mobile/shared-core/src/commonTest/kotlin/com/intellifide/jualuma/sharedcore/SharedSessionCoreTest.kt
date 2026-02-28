package com.intellifide.jualuma.sharedcore

import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SharedSessionCoreTest {
    @Test
    fun `login stores normalized session and auth header`() = runBlocking {
        val gateway = object : AuthGateway {
            override suspend fun login(
                identityToken: String,
                mfaCode: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject {
                return JsonObject(
                    mapOf(
                        "access_token" to JsonPrimitive("api-token"),
                        "refresh_token" to JsonPrimitive("refresh-token"),
                    ),
                )
            }
        }

        val store = InMemorySessionStore()
        val core = SharedSessionCore(gateway, store)

        val session = core.loginWithIdentityToken("identity-token")

        assertEquals("api-token", session.accessToken)
        assertEquals("refresh-token", session.refreshToken)
        assertEquals("Bearer api-token", core.authorizationHeader())
    }

    @Test
    fun `falls back to identity token when access token missing`() = runBlocking {
        val gateway = object : AuthGateway {
            override suspend fun login(
                identityToken: String,
                mfaCode: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject {
                return JsonObject(emptyMap())
            }
        }

        val core = SharedSessionCore(gateway, InMemorySessionStore())
        val session = core.loginWithIdentityToken("identity-token")

        assertEquals("identity-token", session.accessToken)
    }

    @Test
    fun `clear session removes authorization header`() = runBlocking {
        val gateway = object : AuthGateway {
            override suspend fun login(
                identityToken: String,
                mfaCode: String?,
                passkeyAssertion: JsonObject?,
            ): JsonObject {
                return JsonObject(mapOf("access_token" to JsonPrimitive("api-token")))
            }
        }

        val core = SharedSessionCore(gateway, InMemorySessionStore())
        core.loginWithIdentityToken("identity-token")
        core.clearSession()

        assertNull(core.currentSession())
        assertNull(core.authorizationHeader())
    }
}
