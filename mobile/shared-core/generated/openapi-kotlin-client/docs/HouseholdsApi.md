# HouseholdsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**acceptInviteEndpointApiHouseholdsInvitesAcceptPost**](HouseholdsApi.md#acceptInviteEndpointApiHouseholdsInvitesAcceptPost) | **POST** /api/households/invites/accept | Accept Invite Endpoint |
| [**cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete**](HouseholdsApi.md#cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete) | **DELETE** /api/households/invites/{invite_id} | Cancel Invite Endpoint |
| [**checkInviteStatusApiHouseholdsInvitesTokenGet**](HouseholdsApi.md#checkInviteStatusApiHouseholdsInvitesTokenGet) | **GET** /api/households/invites/{token} | Check Invite Status |
| [**createHouseholdApiHouseholdsPost**](HouseholdsApi.md#createHouseholdApiHouseholdsPost) | **POST** /api/households/ | Create Household |
| [**createInviteApiHouseholdsInvitesPost**](HouseholdsApi.md#createInviteApiHouseholdsInvitesPost) | **POST** /api/households/invites | Create Invite |
| [**getMyHouseholdApiHouseholdsMeGet**](HouseholdsApi.md#getMyHouseholdApiHouseholdsMeGet) | **GET** /api/households/me | Get My Household |
| [**leaveHouseholdEndpointApiHouseholdsMembersMeDelete**](HouseholdsApi.md#leaveHouseholdEndpointApiHouseholdsMembersMeDelete) | **DELETE** /api/households/members/me | Leave Household Endpoint |
| [**removeMemberEndpointApiHouseholdsMembersMemberUidDelete**](HouseholdsApi.md#removeMemberEndpointApiHouseholdsMembersMemberUidDelete) | **DELETE** /api/households/members/{member_uid} | Remove Member Endpoint |


<a id="acceptInviteEndpointApiHouseholdsInvitesAcceptPost"></a>
# **acceptInviteEndpointApiHouseholdsInvitesAcceptPost**
> kotlin.Any acceptInviteEndpointApiHouseholdsInvitesAcceptPost(inviteAccept, authorization)

Accept Invite Endpoint

Accept an invite using a token.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val inviteAccept : InviteAccept =  // InviteAccept | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.acceptInviteEndpointApiHouseholdsInvitesAcceptPost(inviteAccept, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#acceptInviteEndpointApiHouseholdsInvitesAcceptPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#acceptInviteEndpointApiHouseholdsInvitesAcceptPost")
    e.printStackTrace()
}
```

### Parameters
| **inviteAccept** | [**InviteAccept**](InviteAccept.md)|  | |
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

<a id="cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete"></a>
# **cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete**
> kotlin.Any cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete(inviteId, authorization)

Cancel Invite Endpoint

Cancel a pending household invite (Admin only).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val inviteId : kotlin.String = inviteId_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete(inviteId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#cancelInviteEndpointApiHouseholdsInvitesInviteIdDelete")
    e.printStackTrace()
}
```

### Parameters
| **inviteId** | **kotlin.String**|  | |
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

<a id="checkInviteStatusApiHouseholdsInvitesTokenGet"></a>
# **checkInviteStatusApiHouseholdsInvitesTokenGet**
> kotlin.Any checkInviteStatusApiHouseholdsInvitesTokenGet(token)

Check Invite Status

Public Endpoint: Check if an invite token is valid. Returns the associated email and whether a user exists. Does NOT require authentication (allowing flow for new users).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val token : kotlin.String = token_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.checkInviteStatusApiHouseholdsInvitesTokenGet(token)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#checkInviteStatusApiHouseholdsInvitesTokenGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#checkInviteStatusApiHouseholdsInvitesTokenGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **token** | **kotlin.String**|  | |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="createHouseholdApiHouseholdsPost"></a>
# **createHouseholdApiHouseholdsPost**
> HouseholdOut createHouseholdApiHouseholdsPost(householdCreate, authorization)

Create Household

Create a new household. Current user becomes Owner/Admin.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val householdCreate : HouseholdCreate =  // HouseholdCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : HouseholdOut = apiInstance.createHouseholdApiHouseholdsPost(householdCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#createHouseholdApiHouseholdsPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#createHouseholdApiHouseholdsPost")
    e.printStackTrace()
}
```

### Parameters
| **householdCreate** | [**HouseholdCreate**](HouseholdCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**HouseholdOut**](HouseholdOut.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="createInviteApiHouseholdsInvitesPost"></a>
# **createInviteApiHouseholdsInvitesPost**
> kotlin.Any createInviteApiHouseholdsInvitesPost(inviteRequest, authorization)

Create Invite

Invite a member to the household (Admin only).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val inviteRequest : InviteRequest =  // InviteRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.createInviteApiHouseholdsInvitesPost(inviteRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#createInviteApiHouseholdsInvitesPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#createInviteApiHouseholdsInvitesPost")
    e.printStackTrace()
}
```

### Parameters
| **inviteRequest** | [**InviteRequest**](InviteRequest.md)|  | |
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

<a id="getMyHouseholdApiHouseholdsMeGet"></a>
# **getMyHouseholdApiHouseholdsMeGet**
> HouseholdOut getMyHouseholdApiHouseholdsMeGet(authorization)

Get My Household

Get details of the household the current user belongs to.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : HouseholdOut = apiInstance.getMyHouseholdApiHouseholdsMeGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#getMyHouseholdApiHouseholdsMeGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#getMyHouseholdApiHouseholdsMeGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**HouseholdOut**](HouseholdOut.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="leaveHouseholdEndpointApiHouseholdsMembersMeDelete"></a>
# **leaveHouseholdEndpointApiHouseholdsMembersMeDelete**
> kotlin.Any leaveHouseholdEndpointApiHouseholdsMembersMeDelete(authorization)

Leave Household Endpoint

Leave the current household (Breakup Protocol).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.leaveHouseholdEndpointApiHouseholdsMembersMeDelete(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#leaveHouseholdEndpointApiHouseholdsMembersMeDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#leaveHouseholdEndpointApiHouseholdsMembersMeDelete")
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

<a id="removeMemberEndpointApiHouseholdsMembersMemberUidDelete"></a>
# **removeMemberEndpointApiHouseholdsMembersMemberUidDelete**
> kotlin.Any removeMemberEndpointApiHouseholdsMembersMemberUidDelete(memberUid, authorization)

Remove Member Endpoint

Remove a household member (Admin only).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = HouseholdsApi()
val memberUid : kotlin.String = memberUid_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.removeMemberEndpointApiHouseholdsMembersMemberUidDelete(memberUid, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling HouseholdsApi#removeMemberEndpointApiHouseholdsMembersMemberUidDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling HouseholdsApi#removeMemberEndpointApiHouseholdsMembersMemberUidDelete")
    e.printStackTrace()
}
```

### Parameters
| **memberUid** | **kotlin.String**|  | |
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

