# NotificationsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**deactivateNotificationDeviceApiNotificationsDevicesDelete**](NotificationsApi.md#deactivateNotificationDeviceApiNotificationsDevicesDelete) | **DELETE** /api/notifications/devices | Deactivate Notification Device |
| [**getNotificationPreferencesApiNotificationsPreferencesGet**](NotificationsApi.md#getNotificationPreferencesApiNotificationsPreferencesGet) | **GET** /api/notifications/preferences | Get Notification Preferences |
| [**getNotificationSettingsApiNotificationsSettingsGet**](NotificationsApi.md#getNotificationSettingsApiNotificationsSettingsGet) | **GET** /api/notifications/settings | Get Notification Settings |
| [**listNotificationsApiNotificationsGet**](NotificationsApi.md#listNotificationsApiNotificationsGet) | **GET** /api/notifications | List Notifications |
| [**markNotificationReadApiNotificationsNotificationIdReadPost**](NotificationsApi.md#markNotificationReadApiNotificationsNotificationIdReadPost) | **POST** /api/notifications/{notification_id}/read | Mark Notification Read |
| [**registerNotificationDeviceApiNotificationsDevicesPost**](NotificationsApi.md#registerNotificationDeviceApiNotificationsDevicesPost) | **POST** /api/notifications/devices | Register Notification Device |
| [**updateNotificationPreferenceApiNotificationsPreferencesPut**](NotificationsApi.md#updateNotificationPreferenceApiNotificationsPreferencesPut) | **PUT** /api/notifications/preferences | Update Notification Preference |
| [**updateNotificationSettingsApiNotificationsSettingsPut**](NotificationsApi.md#updateNotificationSettingsApiNotificationsSettingsPut) | **PUT** /api/notifications/settings | Update Notification Settings |


<a id="deactivateNotificationDeviceApiNotificationsDevicesDelete"></a>
# **deactivateNotificationDeviceApiNotificationsDevicesDelete**
> deactivateNotificationDeviceApiNotificationsDevicesDelete(notificationDeviceDeactivate, authorization)

Deactivate Notification Device

Deactivate a device token for push notifications.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val notificationDeviceDeactivate : NotificationDeviceDeactivate =  // NotificationDeviceDeactivate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    apiInstance.deactivateNotificationDeviceApiNotificationsDevicesDelete(notificationDeviceDeactivate, authorization)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#deactivateNotificationDeviceApiNotificationsDevicesDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#deactivateNotificationDeviceApiNotificationsDevicesDelete")
    e.printStackTrace()
}
```

### Parameters
| **notificationDeviceDeactivate** | [**NotificationDeviceDeactivate**](NotificationDeviceDeactivate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="getNotificationPreferencesApiNotificationsPreferencesGet"></a>
# **getNotificationPreferencesApiNotificationsPreferencesGet**
> kotlin.collections.List&lt;NotificationPreferenceRead&gt; getNotificationPreferencesApiNotificationsPreferencesGet(authorization)

Get Notification Preferences

List all notification preferences.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<NotificationPreferenceRead> = apiInstance.getNotificationPreferencesApiNotificationsPreferencesGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#getNotificationPreferencesApiNotificationsPreferencesGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#getNotificationPreferencesApiNotificationsPreferencesGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;NotificationPreferenceRead&gt;**](NotificationPreferenceRead.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getNotificationSettingsApiNotificationsSettingsGet"></a>
# **getNotificationSettingsApiNotificationsSettingsGet**
> NotificationSettingsRead getNotificationSettingsApiNotificationsSettingsGet(authorization)

Get Notification Settings

Return global notification settings such as alert thresholds.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : NotificationSettingsRead = apiInstance.getNotificationSettingsApiNotificationsSettingsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#getNotificationSettingsApiNotificationsSettingsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#getNotificationSettingsApiNotificationsSettingsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**NotificationSettingsRead**](NotificationSettingsRead.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listNotificationsApiNotificationsGet"></a>
# **listNotificationsApiNotificationsGet**
> kotlin.collections.List&lt;NotificationResponse&gt; listNotificationsApiNotificationsGet(unreadOnly, authorization)

List Notifications

List notifications for the current user.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val unreadOnly : kotlin.Boolean = true // kotlin.Boolean | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<NotificationResponse> = apiInstance.listNotificationsApiNotificationsGet(unreadOnly, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#listNotificationsApiNotificationsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#listNotificationsApiNotificationsGet")
    e.printStackTrace()
}
```

### Parameters
| **unreadOnly** | **kotlin.Boolean**|  | [optional] [default to false] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;NotificationResponse&gt;**](NotificationResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="markNotificationReadApiNotificationsNotificationIdReadPost"></a>
# **markNotificationReadApiNotificationsNotificationIdReadPost**
> markNotificationReadApiNotificationsNotificationIdReadPost(notificationId, authorization)

Mark Notification Read

Mark a notification as read.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val notificationId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    apiInstance.markNotificationReadApiNotificationsNotificationIdReadPost(notificationId, authorization)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#markNotificationReadApiNotificationsNotificationIdReadPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#markNotificationReadApiNotificationsNotificationIdReadPost")
    e.printStackTrace()
}
```

### Parameters
| **notificationId** | **java.util.UUID**|  | |
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

<a id="registerNotificationDeviceApiNotificationsDevicesPost"></a>
# **registerNotificationDeviceApiNotificationsDevicesPost**
> NotificationDeviceRead registerNotificationDeviceApiNotificationsDevicesPost(notificationDeviceCreate, authorization)

Register Notification Device

Register a device token for push notifications.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val notificationDeviceCreate : NotificationDeviceCreate =  // NotificationDeviceCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : NotificationDeviceRead = apiInstance.registerNotificationDeviceApiNotificationsDevicesPost(notificationDeviceCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#registerNotificationDeviceApiNotificationsDevicesPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#registerNotificationDeviceApiNotificationsDevicesPost")
    e.printStackTrace()
}
```

### Parameters
| **notificationDeviceCreate** | [**NotificationDeviceCreate**](NotificationDeviceCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**NotificationDeviceRead**](NotificationDeviceRead.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="updateNotificationPreferenceApiNotificationsPreferencesPut"></a>
# **updateNotificationPreferenceApiNotificationsPreferencesPut**
> NotificationPreferenceRead updateNotificationPreferenceApiNotificationsPreferencesPut(notificationPreferenceUpdate, authorization)

Update Notification Preference

Update a specific notification preference.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val notificationPreferenceUpdate : NotificationPreferenceUpdate =  // NotificationPreferenceUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : NotificationPreferenceRead = apiInstance.updateNotificationPreferenceApiNotificationsPreferencesPut(notificationPreferenceUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#updateNotificationPreferenceApiNotificationsPreferencesPut")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#updateNotificationPreferenceApiNotificationsPreferencesPut")
    e.printStackTrace()
}
```

### Parameters
| **notificationPreferenceUpdate** | [**NotificationPreferenceUpdate**](NotificationPreferenceUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**NotificationPreferenceRead**](NotificationPreferenceRead.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="updateNotificationSettingsApiNotificationsSettingsPut"></a>
# **updateNotificationSettingsApiNotificationsSettingsPut**
> NotificationSettingsRead updateNotificationSettingsApiNotificationsSettingsPut(notificationSettingsUpdate, authorization)

Update Notification Settings

Update global notification settings such as alert thresholds.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = NotificationsApi()
val notificationSettingsUpdate : NotificationSettingsUpdate =  // NotificationSettingsUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : NotificationSettingsRead = apiInstance.updateNotificationSettingsApiNotificationsSettingsPut(notificationSettingsUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling NotificationsApi#updateNotificationSettingsApiNotificationsSettingsPut")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling NotificationsApi#updateNotificationSettingsApiNotificationsSettingsPut")
    e.printStackTrace()
}
```

### Parameters
| **notificationSettingsUpdate** | [**NotificationSettingsUpdate**](NotificationSettingsUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**NotificationSettingsRead**](NotificationSettingsRead.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

