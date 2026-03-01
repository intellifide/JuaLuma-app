package com.intellifide.jualuma.sharedcore

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SharedAuthApi(
    private val httpClient: HttpClient,
    private val config: MobileApiConfig,
) : AuthGateway {
    override suspend fun login(
        identityToken: String,
        mfaCode: String?,
        passkeyAssertion: JsonObject?,
    ): JsonObject {
        val payload = buildJsonObject {
            put("token", identityToken)
            mfaCode?.let { put("mfa_code", it) }
            passkeyAssertion?.let { put("passkey_assertion", it) }
        }
        return httpClient.post("${config.normalizedBaseUrl}/api/auth/login") {
            contentType(ContentType.Application.Json)
            setBody(payload)
        }.body()
    }
}
