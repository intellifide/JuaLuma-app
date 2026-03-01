package com.intellifide.jualuma.sharedcore

import kotlinx.datetime.Clock
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class SharedSessionCore(
    private val authGateway: AuthGateway,
    private val sessionStore: SessionStore,
    private val clock: Clock = Clock.System,
) {
    suspend fun loginWithIdentityToken(
        identityToken: String,
        mfaCode: String? = null,
        passkeyAssertion: JsonObject? = null,
    ): SessionState {
        val profile = authGateway.login(
            identityToken = identityToken,
            mfaCode = mfaCode,
            passkeyAssertion = passkeyAssertion,
        )
        val accessToken = extractString(profile, "access_token") ?: identityToken
        val refreshToken = extractString(profile, "refresh_token")

        val session = SessionState(
            accessToken = accessToken,
            refreshToken = refreshToken,
            issuedAt = clock.now(),
            profile = profile,
        )
        sessionStore.write(session)
        return session
    }

    suspend fun currentSession(): SessionState? = sessionStore.read()

    suspend fun clearSession() {
        sessionStore.clear()
    }

    suspend fun authorizationHeader(): String? {
        return currentSession()?.accessToken?.let { "Bearer $it" }
    }

    private fun extractString(json: JsonObject, key: String): String? {
        val element = json[key] ?: return null
        return if (element is JsonPrimitive) element.content else element.toString()
    }
}
