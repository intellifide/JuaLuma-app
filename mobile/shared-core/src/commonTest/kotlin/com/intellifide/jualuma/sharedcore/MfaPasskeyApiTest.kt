package com.intellifide.jualuma.sharedcore

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestData
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.http.content.TextContent
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class MfaPasskeyApiTest {
    @Test
    fun `requestEmailCode sends anonymous email payload`() = runBlocking {
        lateinit var captured: HttpRequestData
        val api = SharedMfaPasskeyApi(httpClient { captured = it }, config())

        api.requestEmailCode("user@example.com")

        val body = requestBody(captured)
        assertEquals("https://api.example.com/api/auth/mfa/email/request-code", captured.url.toString())
        assertEquals("user@example.com", body["email"]?.jsonPrimitive?.content)
        assertFalse(captured.headers.contains(HttpHeaders.Authorization))
    }

    @Test
    fun `setPrimaryMethod sends passkey assertion and authorization header`() = runBlocking {
        lateinit var captured: HttpRequestData
        val api = SharedMfaPasskeyApi(httpClient { captured = it }, config())

        api.setPrimaryMethod(
            bearerToken = "bearer-token",
            method = MfaMethod.PASSKEY,
            passkeyAssertion = buildJsonObject { put("id", "assertion-1") },
        )

        val body = requestBody(captured)
        assertEquals("Bearer bearer-token", captured.headers[HttpHeaders.Authorization])
        assertEquals("passkey", body["method"]?.jsonPrimitive?.content)
        assertEquals("assertion-1", body["passkey_assertion"]?.jsonObject?.get("id")?.jsonPrimitive?.content)
    }

    @Test
    fun `verifyPasskeyRegistration sends credential and proof fields`() = runBlocking {
        lateinit var captured: HttpRequestData
        val api = SharedMfaPasskeyApi(httpClient { captured = it }, config())

        api.verifyPasskeyRegistration(
            bearerToken = "bearer-token",
            credential = buildJsonObject { put("rawId", "credential-1") },
            mfaCode = "123456",
            passkeyAssertion = buildJsonObject { put("id", "assertion-1") },
        )

        val body = requestBody(captured)
        assertEquals("credential-1", body["credential"]?.jsonObject?.get("rawId")?.jsonPrimitive?.content)
        assertEquals("123456", body["mfa_code"]?.jsonPrimitive?.content)
        assertEquals("assertion-1", body["passkey_assertion"]?.jsonObject?.get("id")?.jsonPrimitive?.content)
    }

    private fun config() = MobileApiConfig("https://api.example.com/", MobileEnvironment.DEV)

    private fun httpClient(capture: (HttpRequestData) -> Unit): HttpClient {
        val engine = MockEngine { request ->
            capture(request)
            respond(
                content = "{}",
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
            )
        }
        return HttpClient(engine) {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true })
            }
        }
    }

    private fun requestBody(request: HttpRequestData) =
        Json.parseToJsonElement((request.body as TextContent).text).jsonObject
}
