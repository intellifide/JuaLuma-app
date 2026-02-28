# BudgetsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**bulkSetBudgetPeriodApiBudgetsBulkPeriodPut**](BudgetsApi.md#bulkSetBudgetPeriodApiBudgetsBulkPeriodPut) | **PUT** /api/budgets/bulk-period | Bulk Set Budget Period |
| [**deleteBudgetApiBudgetsCategoryDelete**](BudgetsApi.md#deleteBudgetApiBudgetsCategoryDelete) | **DELETE** /api/budgets/{category} | Delete Budget |
| [**getBudgetHistoryApiBudgetsHistoryGet**](BudgetsApi.md#getBudgetHistoryApiBudgetsHistoryGet) | **GET** /api/budgets/history | Get Budget History |
| [**getBudgetStatusApiBudgetsStatusGet**](BudgetsApi.md#getBudgetStatusApiBudgetsStatusGet) | **GET** /api/budgets/status | Get Budget Status |
| [**listBudgetsApiBudgetsGet**](BudgetsApi.md#listBudgetsApiBudgetsGet) | **GET** /api/budgets/ | List Budgets |
| [**resetBudgetsApiBudgetsDelete**](BudgetsApi.md#resetBudgetsApiBudgetsDelete) | **DELETE** /api/budgets/ | Reset Budgets |
| [**upsertBudgetApiBudgetsPost**](BudgetsApi.md#upsertBudgetApiBudgetsPost) | **POST** /api/budgets/ | Upsert Budget |


<a id="bulkSetBudgetPeriodApiBudgetsBulkPeriodPut"></a>
# **bulkSetBudgetPeriodApiBudgetsBulkPeriodPut**
> BulkPeriodResponse bulkSetBudgetPeriodApiBudgetsBulkPeriodPut(bulkPeriodRequest, scope, authorization)

Bulk Set Budget Period

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BudgetsApi()
val bulkPeriodRequest : BulkPeriodRequest =  // BulkPeriodRequest | 
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BulkPeriodResponse = apiInstance.bulkSetBudgetPeriodApiBudgetsBulkPeriodPut(bulkPeriodRequest, scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BudgetsApi#bulkSetBudgetPeriodApiBudgetsBulkPeriodPut")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BudgetsApi#bulkSetBudgetPeriodApiBudgetsBulkPeriodPut")
    e.printStackTrace()
}
```

### Parameters
| **bulkPeriodRequest** | [**BulkPeriodRequest**](BulkPeriodRequest.md)|  | |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BulkPeriodResponse**](BulkPeriodResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="deleteBudgetApiBudgetsCategoryDelete"></a>
# **deleteBudgetApiBudgetsCategoryDelete**
> kotlin.Any deleteBudgetApiBudgetsCategoryDelete(category, scope, authorization)

Delete Budget

Delete a budget for a category.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BudgetsApi()
val category : kotlin.String = category_example // kotlin.String | 
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.deleteBudgetApiBudgetsCategoryDelete(category, scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BudgetsApi#deleteBudgetApiBudgetsCategoryDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BudgetsApi#deleteBudgetApiBudgetsCategoryDelete")
    e.printStackTrace()
}
```

### Parameters
| **category** | **kotlin.String**|  | |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
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

<a id="getBudgetHistoryApiBudgetsHistoryGet"></a>
# **getBudgetHistoryApiBudgetsHistoryGet**
> BudgetHistoryResponse getBudgetHistoryApiBudgetsHistoryGet(period, lookback, scope, authorization)

Get Budget History

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BudgetsApi()
val period : kotlin.String = period_example // kotlin.String | 
val lookback : kotlin.Int = 56 // kotlin.Int | 
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BudgetHistoryResponse = apiInstance.getBudgetHistoryApiBudgetsHistoryGet(period, lookback, scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BudgetsApi#getBudgetHistoryApiBudgetsHistoryGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BudgetsApi#getBudgetHistoryApiBudgetsHistoryGet")
    e.printStackTrace()
}
```

### Parameters
| **period** | **kotlin.String**|  | [optional] [default to &quot;monthly&quot;] |
| **lookback** | **kotlin.Int**|  | [optional] [default to 6] |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BudgetHistoryResponse**](BudgetHistoryResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getBudgetStatusApiBudgetsStatusGet"></a>
# **getBudgetStatusApiBudgetsStatusGet**
> BudgetStatusResponse getBudgetStatusApiBudgetsStatusGet(scope, authorization)

Get Budget Status

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BudgetsApi()
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BudgetStatusResponse = apiInstance.getBudgetStatusApiBudgetsStatusGet(scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BudgetsApi#getBudgetStatusApiBudgetsStatusGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BudgetsApi#getBudgetStatusApiBudgetsStatusGet")
    e.printStackTrace()
}
```

### Parameters
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BudgetStatusResponse**](BudgetStatusResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listBudgetsApiBudgetsGet"></a>
# **listBudgetsApiBudgetsGet**
> kotlin.collections.List&lt;BudgetResponse&gt; listBudgetsApiBudgetsGet(scope, authorization)

List Budgets

List all budgets for the authenticated user.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BudgetsApi()
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<BudgetResponse> = apiInstance.listBudgetsApiBudgetsGet(scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BudgetsApi#listBudgetsApiBudgetsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BudgetsApi#listBudgetsApiBudgetsGet")
    e.printStackTrace()
}
```

### Parameters
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;BudgetResponse&gt;**](BudgetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="resetBudgetsApiBudgetsDelete"></a>
# **resetBudgetsApiBudgetsDelete**
> kotlin.Any resetBudgetsApiBudgetsDelete(scope, authorization)

Reset Budgets

Delete all budgets for the authenticated user.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BudgetsApi()
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.resetBudgetsApiBudgetsDelete(scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BudgetsApi#resetBudgetsApiBudgetsDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BudgetsApi#resetBudgetsApiBudgetsDelete")
    e.printStackTrace()
}
```

### Parameters
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
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

<a id="upsertBudgetApiBudgetsPost"></a>
# **upsertBudgetApiBudgetsPost**
> BudgetResponse upsertBudgetApiBudgetsPost(budgetSchema, scope, authorization)

Upsert Budget

Create or update a budget for a specific category.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BudgetsApi()
val budgetSchema : BudgetSchema =  // BudgetSchema | 
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BudgetResponse = apiInstance.upsertBudgetApiBudgetsPost(budgetSchema, scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BudgetsApi#upsertBudgetApiBudgetsPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BudgetsApi#upsertBudgetApiBudgetsPost")
    e.printStackTrace()
}
```

### Parameters
| **budgetSchema** | [**BudgetSchema**](BudgetSchema.md)|  | |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BudgetResponse**](BudgetResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

