# WidgetsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**createWidgetApiWidgetsPost**](WidgetsApi.md#createWidgetApiWidgetsPost) | **POST** /api/widgets/ | Create Widget |
| [**deleteWidgetApiWidgetsWidgetIdDelete**](WidgetsApi.md#deleteWidgetApiWidgetsWidgetIdDelete) | **DELETE** /api/widgets/{widget_id} | Delete Widget |
| [**downloadWidgetApiWidgetsWidgetIdDownloadPost**](WidgetsApi.md#downloadWidgetApiWidgetsWidgetIdDownloadPost) | **POST** /api/widgets/{widget_id}/download | Download Widget |
| [**listMyWidgetsApiWidgetsMineGet**](WidgetsApi.md#listMyWidgetsApiWidgetsMineGet) | **GET** /api/widgets/mine | List My Widgets |
| [**listWidgetsApiWidgetsGet**](WidgetsApi.md#listWidgetsApiWidgetsGet) | **GET** /api/widgets/ | List Widgets |
| [**rateWidgetApiWidgetsWidgetIdRatePost**](WidgetsApi.md#rateWidgetApiWidgetsWidgetIdRatePost) | **POST** /api/widgets/{widget_id}/rate | Rate Widget |
| [**recordWidgetRunApiWidgetsWidgetIdRunPost**](WidgetsApi.md#recordWidgetRunApiWidgetsWidgetIdRunPost) | **POST** /api/widgets/{widget_id}/run | Record Widget Run |
| [**submitWidgetApiWidgetsSubmitPost**](WidgetsApi.md#submitWidgetApiWidgetsSubmitPost) | **POST** /api/widgets/submit | Submit Widget |
| [**updateWidgetApiWidgetsWidgetIdPatch**](WidgetsApi.md#updateWidgetApiWidgetsWidgetIdPatch) | **PATCH** /api/widgets/{widget_id} | Update Widget |


<a id="createWidgetApiWidgetsPost"></a>
# **createWidgetApiWidgetsPost**
> WidgetResponse createWidgetApiWidgetsPost(widgetCreate, authorization)

Create Widget

Create a new widget. Requires Developer Agreement.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val widgetCreate : WidgetCreate =  // WidgetCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : WidgetResponse = apiInstance.createWidgetApiWidgetsPost(widgetCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#createWidgetApiWidgetsPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#createWidgetApiWidgetsPost")
    e.printStackTrace()
}
```

### Parameters
| **widgetCreate** | [**WidgetCreate**](WidgetCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**WidgetResponse**](WidgetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="deleteWidgetApiWidgetsWidgetIdDelete"></a>
# **deleteWidgetApiWidgetsWidgetIdDelete**
> kotlin.collections.Map&lt;kotlin.String, kotlin.String&gt; deleteWidgetApiWidgetsWidgetIdDelete(widgetId, authorization)

Delete Widget

Soft delete a widget. Owner only.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val widgetId : kotlin.String = widgetId_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.String> = apiInstance.deleteWidgetApiWidgetsWidgetIdDelete(widgetId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#deleteWidgetApiWidgetsWidgetIdDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#deleteWidgetApiWidgetsWidgetIdDelete")
    e.printStackTrace()
}
```

### Parameters
| **widgetId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

**kotlin.collections.Map&lt;kotlin.String, kotlin.String&gt;**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="downloadWidgetApiWidgetsWidgetIdDownloadPost"></a>
# **downloadWidgetApiWidgetsWidgetIdDownloadPost**
> kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt; downloadWidgetApiWidgetsWidgetIdDownloadPost(widgetId, authorization)

Download Widget

Download a widget. Increments download count.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val widgetId : kotlin.String = widgetId_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.Any> = apiInstance.downloadWidgetApiWidgetsWidgetIdDownloadPost(widgetId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#downloadWidgetApiWidgetsWidgetIdDownloadPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#downloadWidgetApiWidgetsWidgetIdDownloadPost")
    e.printStackTrace()
}
```

### Parameters
| **widgetId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt;**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listMyWidgetsApiWidgetsMineGet"></a>
# **listMyWidgetsApiWidgetsMineGet**
> kotlin.collections.List&lt;WidgetResponse&gt; listMyWidgetsApiWidgetsMineGet(authorization)

List My Widgets

List widgets owned by the current user.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<WidgetResponse> = apiInstance.listMyWidgetsApiWidgetsMineGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#listMyWidgetsApiWidgetsMineGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#listMyWidgetsApiWidgetsMineGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;WidgetResponse&gt;**](WidgetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listWidgetsApiWidgetsGet"></a>
# **listWidgetsApiWidgetsGet**
> PaginatedWidgetResponse listWidgetsApiWidgetsGet(category, search, page, pageSize)

List Widgets

List available widgets with optional filtering and pagination.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val category : kotlin.String = category_example // kotlin.String | 
val search : kotlin.String = search_example // kotlin.String | 
val page : kotlin.Int = 56 // kotlin.Int | Page number
val pageSize : kotlin.Int = 56 // kotlin.Int | Items per page
try {
    val result : PaginatedWidgetResponse = apiInstance.listWidgetsApiWidgetsGet(category, search, page, pageSize)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#listWidgetsApiWidgetsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#listWidgetsApiWidgetsGet")
    e.printStackTrace()
}
```

### Parameters
| **category** | **kotlin.String**|  | [optional] |
| **search** | **kotlin.String**|  | [optional] |
| **page** | **kotlin.Int**| Page number | [optional] [default to 1] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **pageSize** | **kotlin.Int**| Items per page | [optional] [default to 10] |

### Return type

[**PaginatedWidgetResponse**](PaginatedWidgetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="rateWidgetApiWidgetsWidgetIdRatePost"></a>
# **rateWidgetApiWidgetsWidgetIdRatePost**
> kotlin.collections.Map&lt;kotlin.String, kotlin.String&gt; rateWidgetApiWidgetsWidgetIdRatePost(widgetId, widgetRatingCreate, authorization)

Rate Widget

Rate a widget. 1-5 stars.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val widgetId : kotlin.String = widgetId_example // kotlin.String | 
val widgetRatingCreate : WidgetRatingCreate =  // WidgetRatingCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.String> = apiInstance.rateWidgetApiWidgetsWidgetIdRatePost(widgetId, widgetRatingCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#rateWidgetApiWidgetsWidgetIdRatePost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#rateWidgetApiWidgetsWidgetIdRatePost")
    e.printStackTrace()
}
```

### Parameters
| **widgetId** | **kotlin.String**|  | |
| **widgetRatingCreate** | [**WidgetRatingCreate**](WidgetRatingCreate.md)|  | |
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

<a id="recordWidgetRunApiWidgetsWidgetIdRunPost"></a>
# **recordWidgetRunApiWidgetsWidgetIdRunPost**
> kotlin.collections.Map&lt;kotlin.String, kotlin.String&gt; recordWidgetRunApiWidgetsWidgetIdRunPost(widgetId, authorization)

Record Widget Run

Log a widget execution to the audit log for payout calculations.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val widgetId : kotlin.String = widgetId_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.String> = apiInstance.recordWidgetRunApiWidgetsWidgetIdRunPost(widgetId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#recordWidgetRunApiWidgetsWidgetIdRunPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#recordWidgetRunApiWidgetsWidgetIdRunPost")
    e.printStackTrace()
}
```

### Parameters
| **widgetId** | **kotlin.String**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

**kotlin.collections.Map&lt;kotlin.String, kotlin.String&gt;**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="submitWidgetApiWidgetsSubmitPost"></a>
# **submitWidgetApiWidgetsSubmitPost**
> WidgetResponse submitWidgetApiWidgetsSubmitPost(widgetCreate, authorization)

Submit Widget

Submit a new widget for review. Developer only. (Legacy/Simple)

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val widgetCreate : WidgetCreate =  // WidgetCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : WidgetResponse = apiInstance.submitWidgetApiWidgetsSubmitPost(widgetCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#submitWidgetApiWidgetsSubmitPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#submitWidgetApiWidgetsSubmitPost")
    e.printStackTrace()
}
```

### Parameters
| **widgetCreate** | [**WidgetCreate**](WidgetCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**WidgetResponse**](WidgetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="updateWidgetApiWidgetsWidgetIdPatch"></a>
# **updateWidgetApiWidgetsWidgetIdPatch**
> WidgetResponse updateWidgetApiWidgetsWidgetIdPatch(widgetId, widgetUpdate, authorization)

Update Widget

Update a widget. Owner only.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = WidgetsApi()
val widgetId : kotlin.String = widgetId_example // kotlin.String | 
val widgetUpdate : WidgetUpdate =  // WidgetUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : WidgetResponse = apiInstance.updateWidgetApiWidgetsWidgetIdPatch(widgetId, widgetUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling WidgetsApi#updateWidgetApiWidgetsWidgetIdPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling WidgetsApi#updateWidgetApiWidgetsWidgetIdPatch")
    e.printStackTrace()
}
```

### Parameters
| **widgetId** | **kotlin.String**|  | |
| **widgetUpdate** | [**WidgetUpdate**](WidgetUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**WidgetResponse**](WidgetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

