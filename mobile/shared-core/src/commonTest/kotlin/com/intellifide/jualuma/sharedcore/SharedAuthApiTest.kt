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

class SharedAuthApiTest {
    @Test
    fun `login sends mfa and passkey assertion payload`() = runBlocking {
        lateinit var captured: HttpRequestData
        val client = httpClient { captured = it }
        val api = SharedAuthApi(client, MobileApiConfig("https://api.example.com/", MobileEnvironment.DEV))

        api.login(
            identityToken = "identity-token",
            mfaCode = "123456",
            passkeyAssertion = buildJsonObject { put("id", "assertion-1") },
        )

        val body = requestBody(captured)
        assertEquals("identity-token", body["token"]?.jsonPrimitive?.content)
        assertEquals("123456", body["mfa_code"]?.jsonPrimitive?.content)
        assertEquals("assertion-1", body["passkey_assertion"]?.jsonObject?.get("id")?.jsonPrimitive?.content)
    }

    @Test
    fun `login omits optional fields when null`() = runBlocking {
        lateinit var captured: HttpRequestData
        val client = httpClient { captured = it }
        val api = SharedAuthApi(client, MobileApiConfig("https://api.example.com", MobileEnvironment.DEV))

        api.login(identityToken = "identity-token")

        val body = requestBody(captured)
        assertEquals("identity-token", body["token"]?.jsonPrimitive?.content)
        assertFalse(body.containsKey("mfa_code"))
        assertFalse(body.containsKey("passkey_assertion"))
    }

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
