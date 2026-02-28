# AnalyticsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**getCashFlowApiAnalyticsCashFlowGet**](AnalyticsApi.md#getCashFlowApiAnalyticsCashFlowGet) | **GET** /api/analytics/cash-flow | Get Cash Flow |
| [**getNetWorthApiAnalyticsNetWorthGet**](AnalyticsApi.md#getNetWorthApiAnalyticsNetWorthGet) | **GET** /api/analytics/net-worth | Get Net Worth |
| [**getSpendingByCategoryApiAnalyticsSpendingByCategoryGet**](AnalyticsApi.md#getSpendingByCategoryApiAnalyticsSpendingByCategoryGet) | **GET** /api/analytics/spending-by-category | Get Spending By Category |


<a id="getCashFlowApiAnalyticsCashFlowGet"></a>
# **getCashFlowApiAnalyticsCashFlowGet**
> CashFlowResponse getCashFlowApiAnalyticsCashFlowGet(startDate, endDate, interval, scope, accountType, excludeAccountTypes, category, isManual, authorization)

Get Cash Flow

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AnalyticsApi()
val startDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val endDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val interval : kotlin.String = interval_example // kotlin.String | 
val scope : kotlin.String = scope_example // kotlin.String | 
val accountType : kotlin.String = accountType_example // kotlin.String | Filter by account type (e.g., 'web3', 'cex', 'traditional')
val excludeAccountTypes : kotlin.String = excludeAccountTypes_example // kotlin.String | Comma-separated list of account types to exclude (e.g., 'web3,cex')
val category : kotlin.String = category_example // kotlin.String | Filter by transaction category
val isManual : kotlin.Boolean = true // kotlin.Boolean | Filter by manual transactions (true) or automated (false)
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : CashFlowResponse = apiInstance.getCashFlowApiAnalyticsCashFlowGet(startDate, endDate, interval, scope, accountType, excludeAccountTypes, category, isManual, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AnalyticsApi#getCashFlowApiAnalyticsCashFlowGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AnalyticsApi#getCashFlowApiAnalyticsCashFlowGet")
    e.printStackTrace()
}
```

### Parameters
| **startDate** | **java.time.LocalDate**|  | |
| **endDate** | **java.time.LocalDate**|  | |
| **interval** | **kotlin.String**|  | [optional] [default to &quot;month&quot;] |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| **accountType** | **kotlin.String**| Filter by account type (e.g., &#39;web3&#39;, &#39;cex&#39;, &#39;traditional&#39;) | [optional] |
| **excludeAccountTypes** | **kotlin.String**| Comma-separated list of account types to exclude (e.g., &#39;web3,cex&#39;) | [optional] |
| **category** | **kotlin.String**| Filter by transaction category | [optional] |
| **isManual** | **kotlin.Boolean**| Filter by manual transactions (true) or automated (false) | [optional] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**CashFlowResponse**](CashFlowResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getNetWorthApiAnalyticsNetWorthGet"></a>
# **getNetWorthApiAnalyticsNetWorthGet**
> NetWorthResponse getNetWorthApiAnalyticsNetWorthGet(startDate, endDate, interval, scope, accountType, excludeAccountTypes, category, isManual, authorization)

Get Net Worth

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AnalyticsApi()
val startDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val endDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val interval : kotlin.String = interval_example // kotlin.String | 
val scope : kotlin.String = scope_example // kotlin.String | 
val accountType : kotlin.String = accountType_example // kotlin.String | Filter by account type (e.g., 'web3', 'cex', 'traditional')
val excludeAccountTypes : kotlin.String = excludeAccountTypes_example // kotlin.String | Comma-separated list of account types to exclude (e.g., 'web3,cex')
val category : kotlin.String = category_example // kotlin.String | Filter by transaction category
val isManual : kotlin.Boolean = true // kotlin.Boolean | Filter by manual transactions (true) or automated (false)
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : NetWorthResponse = apiInstance.getNetWorthApiAnalyticsNetWorthGet(startDate, endDate, interval, scope, accountType, excludeAccountTypes, category, isManual, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AnalyticsApi#getNetWorthApiAnalyticsNetWorthGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AnalyticsApi#getNetWorthApiAnalyticsNetWorthGet")
    e.printStackTrace()
}
```

### Parameters
| **startDate** | **java.time.LocalDate**|  | |
| **endDate** | **java.time.LocalDate**|  | |
| **interval** | **kotlin.String**|  | [optional] [default to &quot;daily&quot;] |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| **accountType** | **kotlin.String**| Filter by account type (e.g., &#39;web3&#39;, &#39;cex&#39;, &#39;traditional&#39;) | [optional] |
| **excludeAccountTypes** | **kotlin.String**| Comma-separated list of account types to exclude (e.g., &#39;web3,cex&#39;) | [optional] |
| **category** | **kotlin.String**| Filter by transaction category | [optional] |
| **isManual** | **kotlin.Boolean**| Filter by manual transactions (true) or automated (false) | [optional] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**NetWorthResponse**](NetWorthResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getSpendingByCategoryApiAnalyticsSpendingByCategoryGet"></a>
# **getSpendingByCategoryApiAnalyticsSpendingByCategoryGet**
> SpendingByCategoryResponse getSpendingByCategoryApiAnalyticsSpendingByCategoryGet(startDate, endDate, scope, accountType, excludeAccountTypes, category, isManual, authorization)

Get Spending By Category

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AnalyticsApi()
val startDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val endDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val scope : kotlin.String = scope_example // kotlin.String | 
val accountType : kotlin.String = accountType_example // kotlin.String | Filter by account type (e.g., 'web3', 'cex', 'traditional')
val excludeAccountTypes : kotlin.String = excludeAccountTypes_example // kotlin.String | Comma-separated list of account types to exclude (e.g., 'web3,cex')
val category : kotlin.String = category_example // kotlin.String | Filter by transaction category
val isManual : kotlin.Boolean = true // kotlin.Boolean | Filter by manual transactions (true) or automated (false)
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : SpendingByCategoryResponse = apiInstance.getSpendingByCategoryApiAnalyticsSpendingByCategoryGet(startDate, endDate, scope, accountType, excludeAccountTypes, category, isManual, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AnalyticsApi#getSpendingByCategoryApiAnalyticsSpendingByCategoryGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AnalyticsApi#getSpendingByCategoryApiAnalyticsSpendingByCategoryGet")
    e.printStackTrace()
}
```

### Parameters
| **startDate** | **java.time.LocalDate**|  | |
| **endDate** | **java.time.LocalDate**|  | |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| **accountType** | **kotlin.String**| Filter by account type (e.g., &#39;web3&#39;, &#39;cex&#39;, &#39;traditional&#39;) | [optional] |
| **excludeAccountTypes** | **kotlin.String**| Comma-separated list of account types to exclude (e.g., &#39;web3,cex&#39;) | [optional] |
| **category** | **kotlin.String**| Filter by transaction category | [optional] |
| **isManual** | **kotlin.Boolean**| Filter by manual transactions (true) or automated (false) | [optional] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**SpendingByCategoryResponse**](SpendingByCategoryResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

