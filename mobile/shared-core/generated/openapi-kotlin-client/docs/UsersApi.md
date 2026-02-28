# UsersApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**deleteAccountApiUsersMeDelete**](UsersApi.md#deleteAccountApiUsersMeDelete) | **DELETE** /api/users/me | Delete Account |
| [**exportUserDataApiUsersExportPost**](UsersApi.md#exportUserDataApiUsersExportPost) | **POST** /api/users/export | Export User Data |
| [**getMyProfileApiUsersMeGet**](UsersApi.md#getMyProfileApiUsersMeGet) | **GET** /api/users/me | Get My Profile |
| [**updatePrivacySettingsApiUsersMePrivacyPatch**](UsersApi.md#updatePrivacySettingsApiUsersMePrivacyPatch) | **PATCH** /api/users/me/privacy | Update Privacy Settings |
| [**updateSubscriptionApiUsersSubscriptionPost**](UsersApi.md#updateSubscriptionApiUsersSubscriptionPost) | **POST** /api/users/subscription | Update Subscription |


<a id="deleteAccountApiUsersMeDelete"></a>
# **deleteAccountApiUsersMeDelete**
> deleteAccountApiUsersMeDelete(authorization)

Delete Account

Permanently delete the user account and user-linked data.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = UsersApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    apiInstance.deleteAccountApiUsersMeDelete(authorization)
} catch (e: ClientException) {
    println("4xx response calling UsersApi#deleteAccountApiUsersMeDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UsersApi#deleteAccountApiUsersMeDelete")
    e.printStackTrace()
}
```

### Parameters
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

<a id="exportUserDataApiUsersExportPost"></a>
# **exportUserDataApiUsersExportPost**
> kotlin.Any exportUserDataApiUsersExportPost(authorization)

Export User Data

Export all data associated with the current user. Returns a comprehensive JSON structure.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = UsersApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.exportUserDataApiUsersExportPost(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UsersApi#exportUserDataApiUsersExportPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UsersApi#exportUserDataApiUsersExportPost")
    e.printStackTrace()
}
```

### Parameters
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

<a id="getMyProfileApiUsersMeGet"></a>
# **getMyProfileApiUsersMeGet**
> kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt; getMyProfileApiUsersMeGet(authorization)

Get My Profile

Get the current logged-in user&#39;s profile.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = UsersApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.Any> = apiInstance.getMyProfileApiUsersMeGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UsersApi#getMyProfileApiUsersMeGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UsersApi#getMyProfileApiUsersMeGet")
    e.printStackTrace()
}
```

### Parameters
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

<a id="updatePrivacySettingsApiUsersMePrivacyPatch"></a>
# **updatePrivacySettingsApiUsersMePrivacyPatch**
> kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt; updatePrivacySettingsApiUsersMePrivacyPatch(privacyUpdate, authorization)

Update Privacy Settings

Update user privacy settings.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = UsersApi()
val privacyUpdate : PrivacyUpdate =  // PrivacyUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.Any> = apiInstance.updatePrivacySettingsApiUsersMePrivacyPatch(privacyUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UsersApi#updatePrivacySettingsApiUsersMePrivacyPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UsersApi#updatePrivacySettingsApiUsersMePrivacyPatch")
    e.printStackTrace()
}
```

### Parameters
| **privacyUpdate** | [**PrivacyUpdate**](PrivacyUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt;**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="updateSubscriptionApiUsersSubscriptionPost"></a>
# **updateSubscriptionApiUsersSubscriptionPost**
> kotlin.Any updateSubscriptionApiUsersSubscriptionPost(subscriptionUpdate, authorization)

Update Subscription

Upgrade or Downgrade subscription plan.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = UsersApi()
val subscriptionUpdate : SubscriptionUpdate =  // SubscriptionUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.updateSubscriptionApiUsersSubscriptionPost(subscriptionUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling UsersApi#updateSubscriptionApiUsersSubscriptionPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling UsersApi#updateSubscriptionApiUsersSubscriptionPost")
    e.printStackTrace()
}
```

### Parameters
| **subscriptionUpdate** | [**SubscriptionUpdate**](SubscriptionUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

