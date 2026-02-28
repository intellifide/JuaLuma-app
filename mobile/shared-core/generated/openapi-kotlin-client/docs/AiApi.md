# AiApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**chatEndpointApiAiChatPost**](AiApi.md#chatEndpointApiAiChatPost) | **POST** /api/ai/chat | Chat Endpoint |
| [**chatStreamEndpointApiAiChatStreamPost**](AiApi.md#chatStreamEndpointApiAiChatStreamPost) | **POST** /api/ai/chat/stream | Chat Stream Endpoint |
| [**getChatHistoryApiAiHistoryGet**](AiApi.md#getChatHistoryApiAiHistoryGet) | **GET** /api/ai/history | Get Chat History |
| [**getQuotaStatusApiAiQuotaGet**](AiApi.md#getQuotaStatusApiAiQuotaGet) | **GET** /api/ai/quota | Get Quota Status |


<a id="chatEndpointApiAiChatPost"></a>
# **chatEndpointApiAiChatPost**
> ChatResponse chatEndpointApiAiChatPost(chatRequest, authorization)

Chat Endpoint

Process a chat message from the user.  - **message**: The user&#39;s input prompt.  Checks rate limits based on user tier, retrieves RAG context (if non-free), generates response via Gemini, logs encrypted interaction, and returns response.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AiApi()
val chatRequest : ChatRequest =  // ChatRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : ChatResponse = apiInstance.chatEndpointApiAiChatPost(chatRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AiApi#chatEndpointApiAiChatPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AiApi#chatEndpointApiAiChatPost")
    e.printStackTrace()
}
```

### Parameters
| **chatRequest** | [**ChatRequest**](ChatRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**ChatResponse**](ChatResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="chatStreamEndpointApiAiChatStreamPost"></a>
# **chatStreamEndpointApiAiChatStreamPost**
> kotlin.Any chatStreamEndpointApiAiChatStreamPost(chatRequest, authorization)

Chat Stream Endpoint

Stream AI response chunks as server-sent events.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AiApi()
val chatRequest : ChatRequest =  // ChatRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.chatStreamEndpointApiAiChatStreamPost(chatRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AiApi#chatStreamEndpointApiAiChatStreamPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AiApi#chatStreamEndpointApiAiChatStreamPost")
    e.printStackTrace()
}
```

### Parameters
| **chatRequest** | [**ChatRequest**](ChatRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="getChatHistoryApiAiHistoryGet"></a>
# **getChatHistoryApiAiHistoryGet**
> HistoryResponse getChatHistoryApiAiHistoryGet(authorization)

Get Chat History

Retrieve chat history.  Returns the 10 most recent encrypted chat logs, decrypted for display. Free tier limited to 10 items.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AiApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : HistoryResponse = apiInstance.getChatHistoryApiAiHistoryGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AiApi#getChatHistoryApiAiHistoryGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AiApi#getChatHistoryApiAiHistoryGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**HistoryResponse**](HistoryResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getQuotaStatusApiAiQuotaGet"></a>
# **getQuotaStatusApiAiQuotaGet**
> kotlin.Any getQuotaStatusApiAiQuotaGet(authorization)

Get Quota Status

Get current AI usage quota for the user.  Returns: - **used**: Token usage in current billing-cycle period. - **limit**: Token budget for current billing-cycle period. - **resets_at**: Time of next reset (billing-cycle anniversary). - **tier**: Current subscription plan.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AiApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.getQuotaStatusApiAiQuotaGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AiApi#getQuotaStatusApiAiQuotaGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AiApi#getQuotaStatusApiAiQuotaGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

