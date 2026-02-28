# AccountsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**createManualAccountApiAccountsManualPost**](AccountsApi.md#createManualAccountApiAccountsManualPost) | **POST** /api/accounts/manual | Create Manual Account |
| [**deleteAccountApiAccountsAccountIdDelete**](AccountsApi.md#deleteAccountApiAccountsAccountIdDelete) | **DELETE** /api/accounts/{account_id} | Delete Account |
| [**getAccountDetailsApiAccountsAccountIdGet**](AccountsApi.md#getAccountDetailsApiAccountsAccountIdGet) | **GET** /api/accounts/{account_id} | Get Account Details |
| [**getAccountLimitsApiAccountsLimitsGet**](AccountsApi.md#getAccountLimitsApiAccountsLimitsGet) | **GET** /api/accounts/limits | Get Account Limits |
| [**linkCexAccountApiAccountsLinkCexPost**](AccountsApi.md#linkCexAccountApiAccountsLinkCexPost) | **POST** /api/accounts/link/cex | Link Cex Account |
| [**linkWeb3AccountApiAccountsLinkWeb3Post**](AccountsApi.md#linkWeb3AccountApiAccountsLinkWeb3Post) | **POST** /api/accounts/link/web3 | Link Web3 Account |
| [**listAccountsApiAccountsGet**](AccountsApi.md#listAccountsApiAccountsGet) | **GET** /api/accounts | List Accounts |
| [**refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost**](AccountsApi.md#refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost) | **POST** /api/accounts/{account_id}/refresh-metadata | Refresh Account Metadata |
| [**syncAccountTransactionsApiAccountsAccountIdSyncPost**](AccountsApi.md#syncAccountTransactionsApiAccountsAccountIdSyncPost) | **POST** /api/accounts/{account_id}/sync | Sync Account Transactions |
| [**updateAccountApiAccountsAccountIdPatch**](AccountsApi.md#updateAccountApiAccountsAccountIdPatch) | **PATCH** /api/accounts/{account_id} | Update Account |


<a id="createManualAccountApiAccountsManualPost"></a>
# **createManualAccountApiAccountsManualPost**
> AccountResponse createManualAccountApiAccountsManualPost(accountCreate, authorization)

Create Manual Account

Create a manual account for offline balances or custom asset/liability tracking.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val accountCreate : AccountCreate =  // AccountCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountResponse = apiInstance.createManualAccountApiAccountsManualPost(accountCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#createManualAccountApiAccountsManualPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#createManualAccountApiAccountsManualPost")
    e.printStackTrace()
}
```

### Parameters
| **accountCreate** | [**AccountCreate**](AccountCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountResponse**](AccountResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="deleteAccountApiAccountsAccountIdDelete"></a>
# **deleteAccountApiAccountsAccountIdDelete**
> kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt; deleteAccountApiAccountsAccountIdDelete(accountId, authorization)

Delete Account

Delete an account and cascade related data.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val accountId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.Any> = apiInstance.deleteAccountApiAccountsAccountIdDelete(accountId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#deleteAccountApiAccountsAccountIdDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#deleteAccountApiAccountsAccountIdDelete")
    e.printStackTrace()
}
```

### Parameters
| **accountId** | **java.util.UUID**|  | |
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

<a id="getAccountDetailsApiAccountsAccountIdGet"></a>
# **getAccountDetailsApiAccountsAccountIdGet**
> AccountResponse getAccountDetailsApiAccountsAccountIdGet(accountId, authorization)

Get Account Details

Get detailed information for a specific account.  - **account_id**: UUID of the account.  Returns account details including the 10 most recent transactions.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val accountId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountResponse = apiInstance.getAccountDetailsApiAccountsAccountIdGet(accountId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#getAccountDetailsApiAccountsAccountIdGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#getAccountDetailsApiAccountsAccountIdGet")
    e.printStackTrace()
}
```

### Parameters
| **accountId** | **java.util.UUID**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountResponse**](AccountResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="getAccountLimitsApiAccountsLimitsGet"></a>
# **getAccountLimitsApiAccountsLimitsGet**
> AccountLimitsResponse getAccountLimitsApiAccountsLimitsGet(authorization)

Get Account Limits

Get current account limits for the authenticated user&#39;s subscription tier.  Returns the limits for each account type, current usage, and upgrade information.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountLimitsResponse = apiInstance.getAccountLimitsApiAccountsLimitsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#getAccountLimitsApiAccountsLimitsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#getAccountLimitsApiAccountsLimitsGet")
    e.printStackTrace()
}
```

### Parameters
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountLimitsResponse**](AccountLimitsResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="linkCexAccountApiAccountsLinkCexPost"></a>
# **linkCexAccountApiAccountsLinkCexPost**
> AccountResponse linkCexAccountApiAccountsLinkCexPost(cexLinkRequest, authorization)

Link Cex Account

Link a Centralized Exchange (CEX) account using API credentials. Validates credentials by attempting a connection (or mock validation). Encrypts API secrets before storage.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val cexLinkRequest : CexLinkRequest =  // CexLinkRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountResponse = apiInstance.linkCexAccountApiAccountsLinkCexPost(cexLinkRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#linkCexAccountApiAccountsLinkCexPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#linkCexAccountApiAccountsLinkCexPost")
    e.printStackTrace()
}
```

### Parameters
| **cexLinkRequest** | [**CexLinkRequest**](CexLinkRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountResponse**](AccountResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="linkWeb3AccountApiAccountsLinkWeb3Post"></a>
# **linkWeb3AccountApiAccountsLinkWeb3Post**
> AccountResponse linkWeb3AccountApiAccountsLinkWeb3Post(web3LinkRequest, authorization)

Link Web3 Account

Link a Web3 wallet (chain-agnostic). Validates the address format for the provided chain and prevents duplicate linking of the same chain + address by the same user.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val web3LinkRequest : Web3LinkRequest =  // Web3LinkRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountResponse = apiInstance.linkWeb3AccountApiAccountsLinkWeb3Post(web3LinkRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#linkWeb3AccountApiAccountsLinkWeb3Post")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#linkWeb3AccountApiAccountsLinkWeb3Post")
    e.printStackTrace()
}
```

### Parameters
| **web3LinkRequest** | [**Web3LinkRequest**](Web3LinkRequest.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountResponse**](AccountResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="listAccountsApiAccountsGet"></a>
# **listAccountsApiAccountsGet**
> kotlin.collections.List&lt;AccountResponse&gt; listAccountsApiAccountsGet(accountType, includeBalance, scope, authorization)

List Accounts

Retrieve all accounts owned by the authenticated user.  - **account_type**: Optional filter (e.g., &#39;traditional&#39;, &#39;web3&#39;). - **include_balance**: If true, returns current balance (sensitive). - **scope**: &#39;personal&#39; (default) or &#39;household&#39;.  Returns a list of account summaries.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val accountType : kotlin.String = accountType_example // kotlin.String | Optional filter by account_type.
val includeBalance : kotlin.Boolean = true // kotlin.Boolean | If false, balance will be omitted to reduce sensitivity.
val scope : kotlin.String = scope_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.List<AccountResponse> = apiInstance.listAccountsApiAccountsGet(accountType, includeBalance, scope, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#listAccountsApiAccountsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#listAccountsApiAccountsGet")
    e.printStackTrace()
}
```

### Parameters
| **accountType** | **kotlin.String**| Optional filter by account_type. | [optional] |
| **includeBalance** | **kotlin.Boolean**| If false, balance will be omitted to reduce sensitivity. | [optional] [default to true] |
| **scope** | **kotlin.String**|  | [optional] [default to &quot;personal&quot;] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.collections.List&lt;AccountResponse&gt;**](AccountResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost"></a>
# **refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost**
> AccountResponse refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost(accountId, authorization)

Refresh Account Metadata

Metadata refresh endpoint for backward compatibility.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val accountId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountResponse = apiInstance.refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost(accountId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#refreshAccountMetadataApiAccountsAccountIdRefreshMetadataPost")
    e.printStackTrace()
}
```

### Parameters
| **accountId** | **java.util.UUID**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountResponse**](AccountResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="syncAccountTransactionsApiAccountsAccountIdSyncPost"></a>
# **syncAccountTransactionsApiAccountsAccountIdSyncPost**
> AccountSyncResponse syncAccountTransactionsApiAccountsAccountIdSyncPost(accountId, startDate, endDate, initialSync, authorization)

Sync Account Transactions

Trigger a manual sync of transactions for non-Plaid linked accounts.  - **start_date**: Start of sync window (default: 30 days ago). - **end_date**: End of sync window (default: today). - **initial_sync**: If true, bypasses manual sync limits (internal use only).  Plaid-backed accounts sync automatically via webhooks and cursor jobs. Rate limited for free tier users (unless initial_sync&#x3D;True). Returns sync statistics.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val accountId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val startDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | Start date (inclusive) for the sync window.
val endDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | End date (inclusive) for the sync window.
val initialSync : kotlin.Boolean = true // kotlin.Boolean | Bypass limit for initial post-link hydration.
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountSyncResponse = apiInstance.syncAccountTransactionsApiAccountsAccountIdSyncPost(accountId, startDate, endDate, initialSync, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#syncAccountTransactionsApiAccountsAccountIdSyncPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#syncAccountTransactionsApiAccountsAccountIdSyncPost")
    e.printStackTrace()
}
```

### Parameters
| **accountId** | **java.util.UUID**|  | |
| **startDate** | **java.time.LocalDate**| Start date (inclusive) for the sync window. | [optional] |
| **endDate** | **java.time.LocalDate**| End date (inclusive) for the sync window. | [optional] |
| **initialSync** | **kotlin.Boolean**| Bypass limit for initial post-link hydration. | [optional] [default to false] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountSyncResponse**](AccountSyncResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="updateAccountApiAccountsAccountIdPatch"></a>
# **updateAccountApiAccountsAccountIdPatch**
> AccountResponse updateAccountApiAccountsAccountIdPatch(accountId, accountUpdate, authorization)

Update Account

Update mutable account fields.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = AccountsApi()
val accountId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val accountUpdate : AccountUpdate =  // AccountUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : AccountResponse = apiInstance.updateAccountApiAccountsAccountIdPatch(accountId, accountUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling AccountsApi#updateAccountApiAccountsAccountIdPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling AccountsApi#updateAccountApiAccountsAccountIdPatch")
    e.printStackTrace()
}
```

### Parameters
| **accountId** | **java.util.UUID**|  | |
| **accountUpdate** | [**AccountUpdate**](AccountUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**AccountResponse**](AccountResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

