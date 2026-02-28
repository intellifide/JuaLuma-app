# RecurringApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**forecastRecurringApiRecurringForecastGet**](RecurringApi.md#forecastRecurringApiRecurringForecastGet) | **GET** /api/recurring/forecast | Forecast Recurring |


<a id="forecastRecurringApiRecurringForecastGet"></a>
# **forecastRecurringApiRecurringForecastGet**
> kotlin.collections.List&lt;RecurringForecastResponse&gt; forecastRecurringApiRecurringForecastGet(lookaheadDays, lookbackDays, authorization)

Forecast Recurring

Return recurring bill forecasts within the lookahead window.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = RecurringApi()
val lookaheadDays : kotlin.Int = 56 // kotlin.Int | 
val lookbackDays : kotlin.Int = 56 // kotlin.Int | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<RecurringForecastResponse> = apiInstance.forecastRecurringApiRecurringForecastGet(lookaheadDays, lookbackDays, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling RecurringApi#forecastRecurringApiRecurringForecastGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling RecurringApi#forecastRecurringApiRecurringForecastGet")
    e.printStackTrace()
}
```

### Parameters
| **lookaheadDays** | **kotlin.Int**|  | [optional] [default to 30] |
| **lookbackDays** | **kotlin.Int**|  | [optional] [default to 180] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;RecurringForecastResponse&gt;**](RecurringForecastResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

