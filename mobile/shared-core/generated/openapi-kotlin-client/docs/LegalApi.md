# LegalApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**acceptLegalAgreementsApiLegalAcceptPost**](LegalApi.md#acceptLegalAgreementsApiLegalAcceptPost) | **POST** /api/legal/accept | Accept Legal Agreements |


<a id="acceptLegalAgreementsApiLegalAcceptPost"></a>
# **acceptLegalAgreementsApiLegalAcceptPost**
> kotlin.collections.Map&lt;kotlin.String, kotlin.Int&gt; acceptLegalAgreementsApiLegalAcceptPost(agreementAcceptancesRequest, authorization)

Accept Legal Agreements

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = LegalApi()
val agreementAcceptancesRequest : AgreementAcceptancesRequest =  // AgreementAcceptancesRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.Int> = apiInstance.acceptLegalAgreementsApiLegalAcceptPost(agreementAcceptancesRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling LegalApi#acceptLegalAgreementsApiLegalAcceptPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling LegalApi#acceptLegalAgreementsApiLegalAcceptPost")
    e.printStackTrace()
}
```

### Parameters
| **agreementAcceptancesRequest** | [**AgreementAcceptancesRequest**](AgreementAcceptancesRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

**kotlin.collections.Map&lt;kotlin.String, kotlin.Int&gt;**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

