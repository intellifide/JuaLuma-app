# JobsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**runDigestJobApiJobsDigestsRunPost**](JobsApi.md#runDigestJobApiJobsDigestsRunPost) | **POST** /api/jobs/digests/run | Run Digest Job |
| [**runPlaidCleanupJobApiJobsPlaidCleanupPost**](JobsApi.md#runPlaidCleanupJobApiJobsPlaidCleanupPost) | **POST** /api/jobs/plaid/cleanup | Run Plaid Cleanup Job |
| [**runPlaidProcessJobApiJobsPlaidProcessPost**](JobsApi.md#runPlaidProcessJobApiJobsPlaidProcessPost) | **POST** /api/jobs/plaid/process | Run Plaid Process Job |
| [**runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost**](JobsApi.md#runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost) | **POST** /api/jobs/plaid/safety-net | Run Plaid Safety Net Job |


<a id="runDigestJobApiJobsDigestsRunPost"></a>
# **runDigestJobApiJobsDigestsRunPost**
> kotlin.Any runDigestJobApiJobsDigestsRunPost(xJobRunnerSecret)

Run Digest Job

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = JobsApi()
val xJobRunnerSecret : kotlin.String = xJobRunnerSecret_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.runDigestJobApiJobsDigestsRunPost(xJobRunnerSecret)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling JobsApi#runDigestJobApiJobsDigestsRunPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling JobsApi#runDigestJobApiJobsDigestsRunPost")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xJobRunnerSecret** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="runPlaidCleanupJobApiJobsPlaidCleanupPost"></a>
# **runPlaidCleanupJobApiJobsPlaidCleanupPost**
> kotlin.Any runPlaidCleanupJobApiJobsPlaidCleanupPost(xJobRunnerSecret)

Run Plaid Cleanup Job

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = JobsApi()
val xJobRunnerSecret : kotlin.String = xJobRunnerSecret_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.runPlaidCleanupJobApiJobsPlaidCleanupPost(xJobRunnerSecret)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling JobsApi#runPlaidCleanupJobApiJobsPlaidCleanupPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling JobsApi#runPlaidCleanupJobApiJobsPlaidCleanupPost")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xJobRunnerSecret** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="runPlaidProcessJobApiJobsPlaidProcessPost"></a>
# **runPlaidProcessJobApiJobsPlaidProcessPost**
> kotlin.Any runPlaidProcessJobApiJobsPlaidProcessPost(batchSize, xJobRunnerSecret)

Run Plaid Process Job

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = JobsApi()
val batchSize : kotlin.Int = 56 // kotlin.Int | 
val xJobRunnerSecret : kotlin.String = xJobRunnerSecret_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.runPlaidProcessJobApiJobsPlaidProcessPost(batchSize, xJobRunnerSecret)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling JobsApi#runPlaidProcessJobApiJobsPlaidProcessPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling JobsApi#runPlaidProcessJobApiJobsPlaidProcessPost")
    e.printStackTrace()
}
```

### Parameters
| **batchSize** | **kotlin.Int**|  | [optional] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xJobRunnerSecret** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost"></a>
# **runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost**
> kotlin.Any runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost(batchSize, xJobRunnerSecret)

Run Plaid Safety Net Job

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = JobsApi()
val batchSize : kotlin.Int = 56 // kotlin.Int | 
val xJobRunnerSecret : kotlin.String = xJobRunnerSecret_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost(batchSize, xJobRunnerSecret)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling JobsApi#runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling JobsApi#runPlaidSafetyNetJobApiJobsPlaidSafetyNetPost")
    e.printStackTrace()
}
```

### Parameters
| **batchSize** | **kotlin.Int**|  | [optional] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **xJobRunnerSecret** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

