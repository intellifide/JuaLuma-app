# ManualAssetsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**createManualAssetApiManualAssetsPost**](ManualAssetsApi.md#createManualAssetApiManualAssetsPost) | **POST** /api/manual-assets | Create Manual Asset |
| [**deleteManualAssetApiManualAssetsAssetIdDelete**](ManualAssetsApi.md#deleteManualAssetApiManualAssetsAssetIdDelete) | **DELETE** /api/manual-assets/{asset_id} | Delete Manual Asset |
| [**listManualAssetsApiManualAssetsGet**](ManualAssetsApi.md#listManualAssetsApiManualAssetsGet) | **GET** /api/manual-assets | List Manual Assets |
| [**updateManualAssetApiManualAssetsAssetIdPatch**](ManualAssetsApi.md#updateManualAssetApiManualAssetsAssetIdPatch) | **PATCH** /api/manual-assets/{asset_id} | Update Manual Asset |


<a id="createManualAssetApiManualAssetsPost"></a>
# **createManualAssetApiManualAssetsPost**
> ManualAssetResponse createManualAssetApiManualAssetsPost(manualAssetCreate, authorization)

Create Manual Asset

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = ManualAssetsApi()
val manualAssetCreate : ManualAssetCreate =  // ManualAssetCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : ManualAssetResponse = apiInstance.createManualAssetApiManualAssetsPost(manualAssetCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling ManualAssetsApi#createManualAssetApiManualAssetsPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling ManualAssetsApi#createManualAssetApiManualAssetsPost")
    e.printStackTrace()
}
```

### Parameters
| **manualAssetCreate** | [**ManualAssetCreate**](ManualAssetCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**ManualAssetResponse**](ManualAssetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="deleteManualAssetApiManualAssetsAssetIdDelete"></a>
# **deleteManualAssetApiManualAssetsAssetIdDelete**
> deleteManualAssetApiManualAssetsAssetIdDelete(assetId, authorization)

Delete Manual Asset

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = ManualAssetsApi()
val assetId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    apiInstance.deleteManualAssetApiManualAssetsAssetIdDelete(assetId, authorization)
} catch (e: ClientException) {
    println("4xx response calling ManualAssetsApi#deleteManualAssetApiManualAssetsAssetIdDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling ManualAssetsApi#deleteManualAssetApiManualAssetsAssetIdDelete")
    e.printStackTrace()
}
```

### Parameters
| **assetId** | **java.util.UUID**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listManualAssetsApiManualAssetsGet"></a>
# **listManualAssetsApiManualAssetsGet**
> kotlin.collections.List&lt;ManualAssetResponse&gt; listManualAssetsApiManualAssetsGet(authorization)

List Manual Assets

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = ManualAssetsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<ManualAssetResponse> = apiInstance.listManualAssetsApiManualAssetsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling ManualAssetsApi#listManualAssetsApiManualAssetsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling ManualAssetsApi#listManualAssetsApiManualAssetsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;ManualAssetResponse&gt;**](ManualAssetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="updateManualAssetApiManualAssetsAssetIdPatch"></a>
# **updateManualAssetApiManualAssetsAssetIdPatch**
> ManualAssetResponse updateManualAssetApiManualAssetsAssetIdPatch(assetId, manualAssetUpdate, authorization)

Update Manual Asset

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = ManualAssetsApi()
val assetId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val manualAssetUpdate : ManualAssetUpdate =  // ManualAssetUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : ManualAssetResponse = apiInstance.updateManualAssetApiManualAssetsAssetIdPatch(assetId, manualAssetUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling ManualAssetsApi#updateManualAssetApiManualAssetsAssetIdPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling ManualAssetsApi#updateManualAssetApiManualAssetsAssetIdPatch")
    e.printStackTrace()
}
```

### Parameters
| **assetId** | **java.util.UUID**|  | |
| **manualAssetUpdate** | [**ManualAssetUpdate**](ManualAssetUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**ManualAssetResponse**](ManualAssetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

