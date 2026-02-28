# BillingApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**createCheckoutApiBillingCheckoutSessionPost**](BillingApi.md#createCheckoutApiBillingCheckoutSessionPost) | **POST** /api/billing/checkout/session | Create Checkout |
| [**createPortalApiBillingPortalPost**](BillingApi.md#createPortalApiBillingPortalPost) | **POST** /api/billing/portal | Create Portal |
| [**getInvoicesApiBillingInvoicesGet**](BillingApi.md#getInvoicesApiBillingInvoicesGet) | **GET** /api/billing/invoices | Get Invoices |
| [**getPlansApiBillingPlansGet**](BillingApi.md#getPlansApiBillingPlansGet) | **GET** /api/billing/plans | Get Plans |
| [**selectFreePlanApiBillingPlansFreePost**](BillingApi.md#selectFreePlanApiBillingPlansFreePost) | **POST** /api/billing/plans/free | Select Free Plan |
| [**verifyCheckoutSessionApiBillingCheckoutVerifyPost**](BillingApi.md#verifyCheckoutSessionApiBillingCheckoutVerifyPost) | **POST** /api/billing/checkout/verify | Verify Checkout Session |


<a id="createCheckoutApiBillingCheckoutSessionPost"></a>
# **createCheckoutApiBillingCheckoutSessionPost**
> kotlin.Any createCheckoutApiBillingCheckoutSessionPost(checkoutRequest, authorization)

Create Checkout

Creates a Stripe Checkout Session for a subscription.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BillingApi()
val checkoutRequest : CheckoutRequest =  // CheckoutRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.createCheckoutApiBillingCheckoutSessionPost(checkoutRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BillingApi#createCheckoutApiBillingCheckoutSessionPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BillingApi#createCheckoutApiBillingCheckoutSessionPost")
    e.printStackTrace()
}
```

### Parameters
| **checkoutRequest** | [**CheckoutRequest**](CheckoutRequest.md)|  | |
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

<a id="createPortalApiBillingPortalPost"></a>
# **createPortalApiBillingPortalPost**
> kotlin.Any createPortalApiBillingPortalPost(portalRequest, authorization)

Create Portal

Creates a Stripe Customer Portal session.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BillingApi()
val portalRequest : PortalRequest =  // PortalRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.createPortalApiBillingPortalPost(portalRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BillingApi#createPortalApiBillingPortalPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BillingApi#createPortalApiBillingPortalPost")
    e.printStackTrace()
}
```

### Parameters
| **portalRequest** | [**PortalRequest**](PortalRequest.md)|  | |
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

<a id="getInvoicesApiBillingInvoicesGet"></a>
# **getInvoicesApiBillingInvoicesGet**
> kotlin.Any getInvoicesApiBillingInvoicesGet(authorization)

Get Invoices

Fetch the last 10 invoices for the user from Stripe.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BillingApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.getInvoicesApiBillingInvoicesGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BillingApi#getInvoicesApiBillingInvoicesGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BillingApi#getInvoicesApiBillingInvoicesGet")
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

<a id="getPlansApiBillingPlansGet"></a>
# **getPlansApiBillingPlansGet**
> kotlin.collections.List&lt;SubscriptionPlan&gt; getPlansApiBillingPlansGet()

Get Plans

List all active subscription plans.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BillingApi()
try {
    val result : kotlin.collections.List<SubscriptionPlan> = apiInstance.getPlansApiBillingPlansGet()
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BillingApi#getPlansApiBillingPlansGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BillingApi#getPlansApiBillingPlansGet")
    e.printStackTrace()
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**kotlin.collections.List&lt;SubscriptionPlan&gt;**](SubscriptionPlan.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="selectFreePlanApiBillingPlansFreePost"></a>
# **selectFreePlanApiBillingPlansFreePost**
> kotlin.Any selectFreePlanApiBillingPlansFreePost(authorization)

Select Free Plan

Selects the Free plan and activates the user if they are in the pending plan selection state.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BillingApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.selectFreePlanApiBillingPlansFreePost(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BillingApi#selectFreePlanApiBillingPlansFreePost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BillingApi#selectFreePlanApiBillingPlansFreePost")
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

<a id="verifyCheckoutSessionApiBillingCheckoutVerifyPost"></a>
# **verifyCheckoutSessionApiBillingCheckoutVerifyPost**
> kotlin.Any verifyCheckoutSessionApiBillingCheckoutVerifyPost(sessionVerifyRequest, authorization)

Verify Checkout Session

Manually verify a checkout session if webhooks are delayed (e.g. local dev).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = BillingApi()
val sessionVerifyRequest : SessionVerifyRequest =  // SessionVerifyRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.verifyCheckoutSessionApiBillingCheckoutVerifyPost(sessionVerifyRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling BillingApi#verifyCheckoutSessionApiBillingCheckoutVerifyPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling BillingApi#verifyCheckoutSessionApiBillingCheckoutVerifyPost")
    e.printStackTrace()
}
```

### Parameters
| **sessionVerifyRequest** | [**SessionVerifyRequest**](SessionVerifyRequest.md)|  | |
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

