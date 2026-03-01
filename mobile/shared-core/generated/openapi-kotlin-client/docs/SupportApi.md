# SupportApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**addMessageApiSupportTicketsTicketIdMessagesPost**](SupportApi.md#addMessageApiSupportTicketsTicketIdMessagesPost) | **POST** /api/support/tickets/{ticket_id}/messages | Add Message |
| [**closeTicketApiSupportTicketsTicketIdClosePost**](SupportApi.md#closeTicketApiSupportTicketsTicketIdClosePost) | **POST** /api/support/tickets/{ticket_id}/close | Close Ticket |
| [**createTicketApiSupportTicketsPost**](SupportApi.md#createTicketApiSupportTicketsPost) | **POST** /api/support/tickets | Create Ticket |
| [**getTicketDetailApiSupportTicketsTicketIdGet**](SupportApi.md#getTicketDetailApiSupportTicketsTicketIdGet) | **GET** /api/support/tickets/{ticket_id} | Get Ticket Detail |
| [**getTicketsApiSupportTicketsGet**](SupportApi.md#getTicketsApiSupportTicketsGet) | **GET** /api/support/tickets | Get Tickets |
| [**getTicketsForSupportApiSupportAgentTicketsGet**](SupportApi.md#getTicketsForSupportApiSupportAgentTicketsGet) | **GET** /api/support/agent/tickets | Get Tickets For Support |
| [**rateTicketApiSupportTicketsTicketIdRatePost**](SupportApi.md#rateTicketApiSupportTicketsTicketIdRatePost) | **POST** /api/support/tickets/{ticket_id}/rate | Rate Ticket |
| [**updateTicketStatusApiSupportTicketsTicketIdPatch**](SupportApi.md#updateTicketStatusApiSupportTicketsTicketIdPatch) | **PATCH** /api/support/tickets/{ticket_id} | Update Ticket Status |


<a id="addMessageApiSupportTicketsTicketIdMessagesPost"></a>
# **addMessageApiSupportTicketsTicketIdMessagesPost**
> BackendApiSupportTicketMessageResponse addMessageApiSupportTicketsTicketIdMessagesPost(ticketId, ticketMessageCreate, authorization)

Add Message

Add a message to a ticket (reply).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val ticketMessageCreate : TicketMessageCreate =  // TicketMessageCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BackendApiSupportTicketMessageResponse = apiInstance.addMessageApiSupportTicketsTicketIdMessagesPost(ticketId, ticketMessageCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#addMessageApiSupportTicketsTicketIdMessagesPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#addMessageApiSupportTicketsTicketIdMessagesPost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| **ticketMessageCreate** | [**TicketMessageCreate**](TicketMessageCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BackendApiSupportTicketMessageResponse**](BackendApiSupportTicketMessageResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="closeTicketApiSupportTicketsTicketIdClosePost"></a>
# **closeTicketApiSupportTicketsTicketIdClosePost**
> BackendApiSupportTicketResponse closeTicketApiSupportTicketsTicketIdClosePost(ticketId, authorization)

Close Ticket

Close a ticket.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BackendApiSupportTicketResponse = apiInstance.closeTicketApiSupportTicketsTicketIdClosePost(ticketId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#closeTicketApiSupportTicketsTicketIdClosePost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#closeTicketApiSupportTicketsTicketIdClosePost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BackendApiSupportTicketResponse**](BackendApiSupportTicketResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="createTicketApiSupportTicketsPost"></a>
# **createTicketApiSupportTicketsPost**
> BackendApiSupportTicketResponse createTicketApiSupportTicketsPost(ticketCreate, authorization)

Create Ticket

Create a new support ticket.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val ticketCreate : TicketCreate =  // TicketCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BackendApiSupportTicketResponse = apiInstance.createTicketApiSupportTicketsPost(ticketCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#createTicketApiSupportTicketsPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#createTicketApiSupportTicketsPost")
    e.printStackTrace()
}
```

### Parameters
| **ticketCreate** | [**TicketCreate**](TicketCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BackendApiSupportTicketResponse**](BackendApiSupportTicketResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="getTicketDetailApiSupportTicketsTicketIdGet"></a>
# **getTicketDetailApiSupportTicketsTicketIdGet**
> BackendApiSupportTicketResponse getTicketDetailApiSupportTicketsTicketIdGet(ticketId, authorization)

Get Ticket Detail

Get details of a specific ticket.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BackendApiSupportTicketResponse = apiInstance.getTicketDetailApiSupportTicketsTicketIdGet(ticketId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#getTicketDetailApiSupportTicketsTicketIdGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#getTicketDetailApiSupportTicketsTicketIdGet")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BackendApiSupportTicketResponse**](BackendApiSupportTicketResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getTicketsApiSupportTicketsGet"></a>
# **getTicketsApiSupportTicketsGet**
> kotlin.collections.List&lt;BackendApiSupportTicketResponse&gt; getTicketsApiSupportTicketsGet(authorization)

Get Tickets

List all tickets for the authenticated user.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<BackendApiSupportTicketResponse> = apiInstance.getTicketsApiSupportTicketsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#getTicketsApiSupportTicketsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#getTicketsApiSupportTicketsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;BackendApiSupportTicketResponse&gt;**](BackendApiSupportTicketResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getTicketsForSupportApiSupportAgentTicketsGet"></a>
# **getTicketsForSupportApiSupportAgentTicketsGet**
> kotlin.collections.List&lt;BackendApiSupportTicketResponse&gt; getTicketsForSupportApiSupportAgentTicketsGet(customerUid, authorization)

Get Tickets For Support

List tickets for support agents/managers, optionally filtered by customer.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val customerUid : kotlin.String = customerUid_example // kotlin.String | Optional customer uid filter
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<BackendApiSupportTicketResponse> = apiInstance.getTicketsForSupportApiSupportAgentTicketsGet(customerUid, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#getTicketsForSupportApiSupportAgentTicketsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#getTicketsForSupportApiSupportAgentTicketsGet")
    e.printStackTrace()
}
```

### Parameters
| **customerUid** | **kotlin.String**| Optional customer uid filter | [optional] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;BackendApiSupportTicketResponse&gt;**](BackendApiSupportTicketResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="rateTicketApiSupportTicketsTicketIdRatePost"></a>
# **rateTicketApiSupportTicketsTicketIdRatePost**
> TicketRatingResponse rateTicketApiSupportTicketsTicketIdRatePost(ticketId, ticketRatingCreate, authorization)

Rate Ticket

Rate a support ticket.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val ticketRatingCreate : TicketRatingCreate =  // TicketRatingCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : TicketRatingResponse = apiInstance.rateTicketApiSupportTicketsTicketIdRatePost(ticketId, ticketRatingCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#rateTicketApiSupportTicketsTicketIdRatePost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#rateTicketApiSupportTicketsTicketIdRatePost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| **ticketRatingCreate** | [**TicketRatingCreate**](TicketRatingCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**TicketRatingResponse**](TicketRatingResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="updateTicketStatusApiSupportTicketsTicketIdPatch"></a>
# **updateTicketStatusApiSupportTicketsTicketIdPatch**
> BackendApiSupportTicketResponse updateTicketStatusApiSupportTicketsTicketIdPatch(ticketId, ticketUpdate, authorization)

Update Ticket Status

Update ticket status (user scoped; agents/managers can update any ticket).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val ticketUpdate : TicketUpdate =  // TicketUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : BackendApiSupportTicketResponse = apiInstance.updateTicketStatusApiSupportTicketsTicketIdPatch(ticketId, ticketUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportApi#updateTicketStatusApiSupportTicketsTicketIdPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportApi#updateTicketStatusApiSupportTicketsTicketIdPatch")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| **ticketUpdate** | [**TicketUpdate**](TicketUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**BackendApiSupportTicketResponse**](BackendApiSupportTicketResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

