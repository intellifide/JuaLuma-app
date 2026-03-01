# DevelopersApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**downloadSdkApiDevelopersSdkGet**](DevelopersApi.md#downloadSdkApiDevelopersSdkGet) | **GET** /api/developers/sdk | Download Sdk |
| [**getDeveloperTransactionsApiDevelopersTransactionsGet**](DevelopersApi.md#getDeveloperTransactionsApiDevelopersTransactionsGet) | **GET** /api/developers/transactions | Get Developer Transactions |
| [**getPayoutHistoryApiDevelopersPayoutsGet**](DevelopersApi.md#getPayoutHistoryApiDevelopersPayoutsGet) | **GET** /api/developers/payouts | Get Payout History |
| [**registerDeveloperApiDevelopersPost**](DevelopersApi.md#registerDeveloperApiDevelopersPost) | **POST** /api/developers/ | Register Developer |


<a id="downloadSdkApiDevelopersSdkGet"></a>
# **downloadSdkApiDevelopersSdkGet**
> downloadSdkApiDevelopersSdkGet()

Download Sdk

Download the latest jualuma Widget SDK.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DevelopersApi()
try {
    apiInstance.downloadSdkApiDevelopersSdkGet()
} catch (e: ClientException) {
    println("4xx response calling DevelopersApi#downloadSdkApiDevelopersSdkGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DevelopersApi#downloadSdkApiDevelopersSdkGet")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

<a id="getDeveloperTransactionsApiDevelopersTransactionsGet"></a>
# **getDeveloperTransactionsApiDevelopersTransactionsGet**
> PaginatedPayoutResponse getDeveloperTransactionsApiDevelopersTransactionsGet(page, pageSize, authorization)

Get Developer Transactions

Get paginated developer transactions (payouts).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DevelopersApi()
val page : kotlin.Int = 56 // kotlin.Int | Page number
val pageSize : kotlin.Int = 56 // kotlin.Int | Items per page
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : PaginatedPayoutResponse = apiInstance.getDeveloperTransactionsApiDevelopersTransactionsGet(page, pageSize, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DevelopersApi#getDeveloperTransactionsApiDevelopersTransactionsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DevelopersApi#getDeveloperTransactionsApiDevelopersTransactionsGet")
    e.printStackTrace()
}
```

### Parameters
| **page** | **kotlin.Int**| Page number | [optional] [default to 1] |
| **pageSize** | **kotlin.Int**| Items per page | [optional] [default to 10] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**PaginatedPayoutResponse**](PaginatedPayoutResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getPayoutHistoryApiDevelopersPayoutsGet"></a>
# **getPayoutHistoryApiDevelopersPayoutsGet**
> kotlin.collections.List&lt;PayoutResponse&gt; getPayoutHistoryApiDevelopersPayoutsGet(authorization)

Get Payout History

Get payout history for the authenticated developer.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DevelopersApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<PayoutResponse> = apiInstance.getPayoutHistoryApiDevelopersPayoutsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DevelopersApi#getPayoutHistoryApiDevelopersPayoutsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DevelopersApi#getPayoutHistoryApiDevelopersPayoutsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;PayoutResponse&gt;**](PayoutResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="registerDeveloperApiDevelopersPost"></a>
# **registerDeveloperApiDevelopersPost**
> kotlin.collections.Map&lt;kotlin.String, kotlin.String&gt; registerDeveloperApiDevelopersPost(developerCreate, authorization)

Register Developer

Register as a developer. Requires Pro/Ultimate.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DevelopersApi()
val developerCreate : DeveloperCreate =  // DeveloperCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.String> = apiInstance.registerDeveloperApiDevelopersPost(developerCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DevelopersApi#registerDeveloperApiDevelopersPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DevelopersApi#registerDeveloperApiDevelopersPost")
    e.printStackTrace()
}
```

### Parameters
| **developerCreate** | [**DeveloperCreate**](DeveloperCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

**kotlin.collections.Map&lt;kotlin.String, kotlin.String&gt;**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

