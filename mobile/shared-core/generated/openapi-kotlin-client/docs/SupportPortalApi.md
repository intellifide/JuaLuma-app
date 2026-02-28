# SupportPortalApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**assignTicketApiSupportPortalTicketsTicketIdAssignPost**](SupportPortalApi.md#assignTicketApiSupportPortalTicketsTicketIdAssignPost) | **POST** /api/support-portal/tickets/{ticket_id}/assign | Assign Ticket |
| [**escalateTicketApiSupportPortalTicketsTicketIdEscalatePost**](SupportPortalApi.md#escalateTicketApiSupportPortalTicketsTicketIdEscalatePost) | **POST** /api/support-portal/tickets/{ticket_id}/escalate | Escalate Ticket |
| [**getTicketDetailApiSupportPortalTicketsTicketIdGet**](SupportPortalApi.md#getTicketDetailApiSupportPortalTicketsTicketIdGet) | **GET** /api/support-portal/tickets/{ticket_id} | Get Ticket Detail |
| [**listAgentsApiSupportPortalAgentsGet**](SupportPortalApi.md#listAgentsApiSupportPortalAgentsGet) | **GET** /api/support-portal/agents | List Agents |
| [**listTicketsApiSupportPortalTicketsGet**](SupportPortalApi.md#listTicketsApiSupportPortalTicketsGet) | **GET** /api/support-portal/tickets | List Tickets |
| [**pickupTicketApiSupportPortalTicketsTicketIdPickupPost**](SupportPortalApi.md#pickupTicketApiSupportPortalTicketsTicketIdPickupPost) | **POST** /api/support-portal/tickets/{ticket_id}/pickup | Pickup Ticket |
| [**replyToTicketApiSupportPortalTicketsTicketIdReplyPost**](SupportPortalApi.md#replyToTicketApiSupportPortalTicketsTicketIdReplyPost) | **POST** /api/support-portal/tickets/{ticket_id}/reply | Reply To Ticket |
| [**updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost**](SupportPortalApi.md#updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost) | **POST** /api/support-portal/tickets/{ticket_id}/status | Update Ticket Status |


<a id="assignTicketApiSupportPortalTicketsTicketIdAssignPost"></a>
# **assignTicketApiSupportPortalTicketsTicketIdAssignPost**
> kotlin.Any assignTicketApiSupportPortalTicketsTicketIdAssignPost(ticketId, ticketAssignmentRequest, authorization)

Assign Ticket

Assign or reassign a ticket to a support agent.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val ticketAssignmentRequest : TicketAssignmentRequest =  // TicketAssignmentRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.assignTicketApiSupportPortalTicketsTicketIdAssignPost(ticketId, ticketAssignmentRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#assignTicketApiSupportPortalTicketsTicketIdAssignPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#assignTicketApiSupportPortalTicketsTicketIdAssignPost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| **ticketAssignmentRequest** | [**TicketAssignmentRequest**](TicketAssignmentRequest.md)|  | |
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

<a id="escalateTicketApiSupportPortalTicketsTicketIdEscalatePost"></a>
# **escalateTicketApiSupportPortalTicketsTicketIdEscalatePost**
> kotlin.Any escalateTicketApiSupportPortalTicketsTicketIdEscalatePost(ticketId, ticketEscalationRequest, authorization)

Escalate Ticket

Escalate a technical ticket to the developer.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val ticketEscalationRequest : TicketEscalationRequest =  // TicketEscalationRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.escalateTicketApiSupportPortalTicketsTicketIdEscalatePost(ticketId, ticketEscalationRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#escalateTicketApiSupportPortalTicketsTicketIdEscalatePost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#escalateTicketApiSupportPortalTicketsTicketIdEscalatePost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| **ticketEscalationRequest** | [**TicketEscalationRequest**](TicketEscalationRequest.md)|  | |
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

<a id="getTicketDetailApiSupportPortalTicketsTicketIdGet"></a>
# **getTicketDetailApiSupportPortalTicketsTicketIdGet**
> TicketDetailResponse getTicketDetailApiSupportPortalTicketsTicketIdGet(ticketId, authorization)

Get Ticket Detail

Get ticket details and log VIEW audit.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : TicketDetailResponse = apiInstance.getTicketDetailApiSupportPortalTicketsTicketIdGet(ticketId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#getTicketDetailApiSupportPortalTicketsTicketIdGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#getTicketDetailApiSupportPortalTicketsTicketIdGet")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**TicketDetailResponse**](TicketDetailResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listAgentsApiSupportPortalAgentsGet"></a>
# **listAgentsApiSupportPortalAgentsGet**
> kotlin.collections.List&lt;AgentSummary&gt; listAgentsApiSupportPortalAgentsGet(authorization)

List Agents

List available support agents for assignment.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<AgentSummary> = apiInstance.listAgentsApiSupportPortalAgentsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#listAgentsApiSupportPortalAgentsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#listAgentsApiSupportPortalAgentsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;AgentSummary&gt;**](AgentSummary.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listTicketsApiSupportPortalTicketsGet"></a>
# **listTicketsApiSupportPortalTicketsGet**
> kotlin.collections.List&lt;BackendSchemasSupportPortalTicketResponse&gt; listTicketsApiSupportPortalTicketsGet(status, queueStatus, assignee, authorization)

List Tickets

List all tickets, optionally filtered by status/queue/assignee.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val status : kotlin.String = status_example // kotlin.String | 
val queueStatus : kotlin.String = queueStatus_example // kotlin.String | 
val assignee : kotlin.String = assignee_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<BackendSchemasSupportPortalTicketResponse> = apiInstance.listTicketsApiSupportPortalTicketsGet(status, queueStatus, assignee, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#listTicketsApiSupportPortalTicketsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#listTicketsApiSupportPortalTicketsGet")
    e.printStackTrace()
}
```

### Parameters
| **status** | **kotlin.String**|  | [optional] |
| **queueStatus** | **kotlin.String**|  | [optional] |
| **assignee** | **kotlin.String**|  | [optional] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;BackendSchemasSupportPortalTicketResponse&gt;**](BackendSchemasSupportPortalTicketResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="pickupTicketApiSupportPortalTicketsTicketIdPickupPost"></a>
# **pickupTicketApiSupportPortalTicketsTicketIdPickupPost**
> kotlin.Any pickupTicketApiSupportPortalTicketsTicketIdPickupPost(ticketId, authorization)

Pickup Ticket

Assign a ticket in the queue to the current agent.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.pickupTicketApiSupportPortalTicketsTicketIdPickupPost(ticketId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#pickupTicketApiSupportPortalTicketsTicketIdPickupPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#pickupTicketApiSupportPortalTicketsTicketIdPickupPost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
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

<a id="replyToTicketApiSupportPortalTicketsTicketIdReplyPost"></a>
# **replyToTicketApiSupportPortalTicketsTicketIdReplyPost**
> kotlin.Any replyToTicketApiSupportPortalTicketsTicketIdReplyPost(ticketId, agentReplyRequest, authorization)

Reply To Ticket

Agent reply to ticket and log REPLY audit.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val agentReplyRequest : AgentReplyRequest =  // AgentReplyRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.replyToTicketApiSupportPortalTicketsTicketIdReplyPost(ticketId, agentReplyRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#replyToTicketApiSupportPortalTicketsTicketIdReplyPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#replyToTicketApiSupportPortalTicketsTicketIdReplyPost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| **agentReplyRequest** | [**AgentReplyRequest**](AgentReplyRequest.md)|  | |
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

<a id="updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost"></a>
# **updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost**
> kotlin.Any updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost(ticketId, ticketStatusUpdate, authorization)

Update Ticket Status

Resolve/Close ticket and log STATUS_CHANGE audit.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = SupportPortalApi()
val ticketId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val ticketStatusUpdate : TicketStatusUpdate =  // TicketStatusUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost(ticketId, ticketStatusUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling SupportPortalApi#updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling SupportPortalApi#updateTicketStatusApiSupportPortalTicketsTicketIdStatusPost")
    e.printStackTrace()
}
```

### Parameters
| **ticketId** | **java.util.UUID**|  | |
| **ticketStatusUpdate** | [**TicketStatusUpdate**](TicketStatusUpdate.md)|  | |
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

