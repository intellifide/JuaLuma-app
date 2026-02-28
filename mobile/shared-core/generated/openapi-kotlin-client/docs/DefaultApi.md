# DefaultApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**healthCheckApiHealthGet**](DefaultApi.md#healthCheckApiHealthGet) | **GET** /api/health | Health Check |
| [**healthCheckHealthGet**](DefaultApi.md#healthCheckHealthGet) | **GET** /health | Health Check |
| [**rootApiGet**](DefaultApi.md#rootApiGet) | **GET** /api | Root |
| [**rootGet**](DefaultApi.md#rootGet) | **GET** / | Root |


<a id="healthCheckApiHealthGet"></a>
# **healthCheckApiHealthGet**
> kotlin.Any healthCheckApiHealthGet()

Health Check

Active health probe for orchestrators and local dev tooling.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DefaultApi()
try {
    val result : kotlin.Any = apiInstance.healthCheckApiHealthGet()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#healthCheckApiHealthGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#healthCheckApiHealthGet")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="healthCheckHealthGet"></a>
# **healthCheckHealthGet**
> kotlin.Any healthCheckHealthGet()

Health Check

Active health probe for orchestrators and local dev tooling.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DefaultApi()
try {
    val result : kotlin.Any = apiInstance.healthCheckHealthGet()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#healthCheckHealthGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#healthCheckHealthGet")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="rootApiGet"></a>
# **rootApiGet**
> kotlin.Any rootApiGet()

Root

Lightweight service descriptor for uptime checks and metadata.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DefaultApi()
try {
    val result : kotlin.Any = apiInstance.rootApiGet()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#rootApiGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#rootApiGet")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="rootGet"></a>
# **rootGet**
> kotlin.Any rootGet()

Root

Lightweight service descriptor for uptime checks and metadata.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DefaultApi()
try {
    val result : kotlin.Any = apiInstance.rootGet()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DefaultApi#rootGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DefaultApi#rootGet")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

