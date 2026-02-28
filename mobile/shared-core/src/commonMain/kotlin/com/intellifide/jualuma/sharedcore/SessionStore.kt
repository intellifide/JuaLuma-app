package com.intellifide.jualuma.sharedcore

import kotlinx.datetime.Instant
import kotlinx.serialization.json.JsonObject

data class SessionState(
    val accessToken: String,
    val refreshToken: String?,
    val issuedAt: Instant,
    val profile: JsonObject,
)

interface SessionStore {
    suspend fun read(): SessionState?
    suspend fun write(state: SessionState)
    suspend fun clear()
}

class InMemorySessionStore(
) : SessionStore {
    private var state: SessionState? = null

    override suspend fun read(): SessionState? = state

    override suspend fun write(state: SessionState) {
        this.state = state
    }

    override suspend fun clear() {
        state = null
    }
}
