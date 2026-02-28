# PlaidApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**createLinkTokenEndpointApiPlaidLinkTokenPost**](PlaidApi.md#createLinkTokenEndpointApiPlaidLinkTokenPost) | **POST** /api/plaid/link-token | Create Link Token Endpoint |
| [**createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost**](PlaidApi.md#createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost) | **POST** /api/plaid/link-token/update | Create Update Link Token Endpoint |
| [**exchangeTokenEndpointApiPlaidExchangeTokenPost**](PlaidApi.md#exchangeTokenEndpointApiPlaidExchangeTokenPost) | **POST** /api/plaid/exchange-token | Exchange Token Endpoint |


<a id="createLinkTokenEndpointApiPlaidLinkTokenPost"></a>
# **createLinkTokenEndpointApiPlaidLinkTokenPost**
> LinkTokenResponse createLinkTokenEndpointApiPlaidLinkTokenPost(authorization)

Create Link Token Endpoint

Create a link_token for the authenticated user with tier-specific history limits.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = PlaidApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : LinkTokenResponse = apiInstance.createLinkTokenEndpointApiPlaidLinkTokenPost(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling PlaidApi#createLinkTokenEndpointApiPlaidLinkTokenPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling PlaidApi#createLinkTokenEndpointApiPlaidLinkTokenPost")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**LinkTokenResponse**](LinkTokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost"></a>
# **createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost**
> LinkTokenResponse createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost(linkTokenUpdateRequest, authorization)

Create Update Link Token Endpoint

Create an update-mode Link token for an existing Plaid Item.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = PlaidApi()
val linkTokenUpdateRequest : LinkTokenUpdateRequest =  // LinkTokenUpdateRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : LinkTokenResponse = apiInstance.createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost(linkTokenUpdateRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling PlaidApi#createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling PlaidApi#createUpdateLinkTokenEndpointApiPlaidLinkTokenUpdatePost")
    e.printStackTrace()
}
```

### Parameters
| **linkTokenUpdateRequest** | [**LinkTokenUpdateRequest**](LinkTokenUpdateRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**LinkTokenResponse**](LinkTokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="exchangeTokenEndpointApiPlaidExchangeTokenPost"></a>
# **exchangeTokenEndpointApiPlaidExchangeTokenPost**
> ExchangeTokenResponse exchangeTokenEndpointApiPlaidExchangeTokenPost(exchangeTokenRequest, authorization)

Exchange Token Endpoint

Exchange a public_token, persist/update Plaid Item + account mappings, and log the action.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = PlaidApi()
val exchangeTokenRequest : ExchangeTokenRequest =  // ExchangeTokenRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : ExchangeTokenResponse = apiInstance.exchangeTokenEndpointApiPlaidExchangeTokenPost(exchangeTokenRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling PlaidApi#exchangeTokenEndpointApiPlaidExchangeTokenPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling PlaidApi#exchangeTokenEndpointApiPlaidExchangeTokenPost")
    e.printStackTrace()
}
```

### Parameters
| **exchangeTokenRequest** | [**ExchangeTokenRequest**](ExchangeTokenRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**ExchangeTokenResponse**](ExchangeTokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

