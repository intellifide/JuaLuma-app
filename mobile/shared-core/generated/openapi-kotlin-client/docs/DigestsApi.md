# DigestsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**getDigestSettingsApiDigestsSettingsGet**](DigestsApi.md#getDigestSettingsApiDigestsSettingsGet) | **GET** /api/digests/settings | Get Digest Settings |
| [**getDigestThreadMessagesApiDigestsThreadsThreadIdGet**](DigestsApi.md#getDigestThreadMessagesApiDigestsThreadsThreadIdGet) | **GET** /api/digests/threads/{thread_id} | Get Digest Thread Messages |
| [**getDigestThreadsApiDigestsThreadsGet**](DigestsApi.md#getDigestThreadsApiDigestsThreadsGet) | **GET** /api/digests/threads | Get Digest Threads |
| [**patchDigestSettingsApiDigestsSettingsPatch**](DigestsApi.md#patchDigestSettingsApiDigestsSettingsPatch) | **PATCH** /api/digests/settings | Patch Digest Settings |
| [**runDigestNowEndpointApiDigestsRunNowPost**](DigestsApi.md#runDigestNowEndpointApiDigestsRunNowPost) | **POST** /api/digests/run-now | Run Digest Now Endpoint |


<a id="getDigestSettingsApiDigestsSettingsGet"></a>
# **getDigestSettingsApiDigestsSettingsGet**
> DigestSettingsResponse getDigestSettingsApiDigestsSettingsGet(authorization)

Get Digest Settings

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DigestsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : DigestSettingsResponse = apiInstance.getDigestSettingsApiDigestsSettingsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DigestsApi#getDigestSettingsApiDigestsSettingsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DigestsApi#getDigestSettingsApiDigestsSettingsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**DigestSettingsResponse**](DigestSettingsResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getDigestThreadMessagesApiDigestsThreadsThreadIdGet"></a>
# **getDigestThreadMessagesApiDigestsThreadsThreadIdGet**
> DigestThreadMessagesResponse getDigestThreadMessagesApiDigestsThreadsThreadIdGet(threadId, authorization)

Get Digest Thread Messages

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DigestsApi()
val threadId : kotlin.String = threadId_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : DigestThreadMessagesResponse = apiInstance.getDigestThreadMessagesApiDigestsThreadsThreadIdGet(threadId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DigestsApi#getDigestThreadMessagesApiDigestsThreadsThreadIdGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DigestsApi#getDigestThreadMessagesApiDigestsThreadsThreadIdGet")
    e.printStackTrace()
}
```

### Parameters
| **threadId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**DigestThreadMessagesResponse**](DigestThreadMessagesResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getDigestThreadsApiDigestsThreadsGet"></a>
# **getDigestThreadsApiDigestsThreadsGet**
> DigestThreadsResponse getDigestThreadsApiDigestsThreadsGet(authorization)

Get Digest Threads

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DigestsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : DigestThreadsResponse = apiInstance.getDigestThreadsApiDigestsThreadsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DigestsApi#getDigestThreadsApiDigestsThreadsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DigestsApi#getDigestThreadsApiDigestsThreadsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**DigestThreadsResponse**](DigestThreadsResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="patchDigestSettingsApiDigestsSettingsPatch"></a>
# **patchDigestSettingsApiDigestsSettingsPatch**
> DigestSettingsResponse patchDigestSettingsApiDigestsSettingsPatch(digestSettingsUpdateRequest, authorization)

Patch Digest Settings

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DigestsApi()
val digestSettingsUpdateRequest : DigestSettingsUpdateRequest =  // DigestSettingsUpdateRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : DigestSettingsResponse = apiInstance.patchDigestSettingsApiDigestsSettingsPatch(digestSettingsUpdateRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DigestsApi#patchDigestSettingsApiDigestsSettingsPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DigestsApi#patchDigestSettingsApiDigestsSettingsPatch")
    e.printStackTrace()
}
```

### Parameters
| **digestSettingsUpdateRequest** | [**DigestSettingsUpdateRequest**](DigestSettingsUpdateRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**DigestSettingsResponse**](DigestSettingsResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="runDigestNowEndpointApiDigestsRunNowPost"></a>
# **runDigestNowEndpointApiDigestsRunNowPost**
> kotlin.Any runDigestNowEndpointApiDigestsRunNowPost(authorization)

Run Digest Now Endpoint

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DigestsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.runDigestNowEndpointApiDigestsRunNowPost(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DigestsApi#runDigestNowEndpointApiDigestsRunNowPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DigestsApi#runDigestNowEndpointApiDigestsRunNowPost")
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

