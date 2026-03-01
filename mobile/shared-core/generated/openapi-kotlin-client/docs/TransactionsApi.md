# TransactionsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**bulkUpdateTransactionsApiTransactionsBulkPatch**](TransactionsApi.md#bulkUpdateTransactionsApiTransactionsBulkPatch) | **PATCH** /api/transactions/bulk | Bulk Update Transactions |
| [**createManualTransactionApiTransactionsPost**](TransactionsApi.md#createManualTransactionApiTransactionsPost) | **POST** /api/transactions | Create Manual Transaction |
| [**deleteTransactionApiTransactionsTransactionIdDelete**](TransactionsApi.md#deleteTransactionApiTransactionsTransactionIdDelete) | **DELETE** /api/transactions/{transaction_id} | Delete Transaction |
| [**getTransactionApiTransactionsTransactionIdGet**](TransactionsApi.md#getTransactionApiTransactionsTransactionIdGet) | **GET** /api/transactions/{transaction_id} | Get Transaction |
| [**listTransactionsApiTransactionsGet**](TransactionsApi.md#listTransactionsApiTransactionsGet) | **GET** /api/transactions | List Transactions |
| [**searchTransactionsApiTransactionsSearchGet**](TransactionsApi.md#searchTransactionsApiTransactionsSearchGet) | **GET** /api/transactions/search | Search Transactions |
| [**updateTransactionApiTransactionsTransactionIdPatch**](TransactionsApi.md#updateTransactionApiTransactionsTransactionIdPatch) | **PATCH** /api/transactions/{transaction_id} | Update Transaction |


<a id="bulkUpdateTransactionsApiTransactionsBulkPatch"></a>
# **bulkUpdateTransactionsApiTransactionsBulkPatch**
> kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt; bulkUpdateTransactionsApiTransactionsBulkPatch(bulkUpdateRequest, authorization)

Bulk Update Transactions

Bulk update transactions in a single DB transaction.  - **transaction_ids**: List of IDs to update. - **updates**: Fields to update (category, description).  Restricted to user&#39;s own transactions.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = TransactionsApi()
val bulkUpdateRequest : BulkUpdateRequest =  // BulkUpdateRequest | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.Any> = apiInstance.bulkUpdateTransactionsApiTransactionsBulkPatch(bulkUpdateRequest, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling TransactionsApi#bulkUpdateTransactionsApiTransactionsBulkPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling TransactionsApi#bulkUpdateTransactionsApiTransactionsBulkPatch")
    e.printStackTrace()
}
```

### Parameters
| **bulkUpdateRequest** | [**BulkUpdateRequest**](BulkUpdateRequest.md)|  | |
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

<a id="createManualTransactionApiTransactionsPost"></a>
# **createManualTransactionApiTransactionsPost**
> TransactionResponse createManualTransactionApiTransactionsPost(transactionCreate, authorization)

Create Manual Transaction

Create a manual transaction entry.  Restricted to Pro and Ultimate tier subscribers.  - **account_id**: UUID of the account to associate this transaction with. - **ts**: Transaction timestamp. - **amount**: Transaction amount (positive for income, negative for expenses). - **currency**: Currency code (default: USD). - **category**: Optional category. - **merchant_name**: Optional merchant name. - **description**: Optional description.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = TransactionsApi()
val transactionCreate : TransactionCreate =  // TransactionCreate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : TransactionResponse = apiInstance.createManualTransactionApiTransactionsPost(transactionCreate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling TransactionsApi#createManualTransactionApiTransactionsPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling TransactionsApi#createManualTransactionApiTransactionsPost")
    e.printStackTrace()
}
```

### Parameters
| **transactionCreate** | [**TransactionCreate**](TransactionCreate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**TransactionResponse**](TransactionResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a id="deleteTransactionApiTransactionsTransactionIdDelete"></a>
# **deleteTransactionApiTransactionsTransactionIdDelete**
> kotlin.collections.Map&lt;kotlin.String, kotlin.Any&gt; deleteTransactionApiTransactionsTransactionIdDelete(transactionId, authorization)

Delete Transaction

Soft delete a manual transaction.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = TransactionsApi()
val transactionId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.collections.Map<kotlin.String, kotlin.Any> = apiInstance.deleteTransactionApiTransactionsTransactionIdDelete(transactionId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling TransactionsApi#deleteTransactionApiTransactionsTransactionIdDelete")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling TransactionsApi#deleteTransactionApiTransactionsTransactionIdDelete")
    e.printStackTrace()
}
```

### Parameters
| **transactionId** | **java.util.UUID**|  | |
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

<a id="getTransactionApiTransactionsTransactionIdGet"></a>
# **getTransactionApiTransactionsTransactionIdGet**
> TransactionResponse getTransactionApiTransactionsTransactionIdGet(transactionId, authorization)

Get Transaction

Return a single transaction with raw data.  - **transaction_id**: UUID of the transaction.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = TransactionsApi()
val transactionId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : TransactionResponse = apiInstance.getTransactionApiTransactionsTransactionIdGet(transactionId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling TransactionsApi#getTransactionApiTransactionsTransactionIdGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling TransactionsApi#getTransactionApiTransactionsTransactionIdGet")
    e.printStackTrace()
}
```

### Parameters
| **transactionId** | **java.util.UUID**|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**TransactionResponse**](TransactionResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="listTransactionsApiTransactionsGet"></a>
# **listTransactionsApiTransactionsGet**
> TransactionListResponse listTransactionsApiTransactionsGet(accountId, category, startDate, endDate, search, accountType, excludeAccountTypes, isManual, sortBy, scope, page, pageSize, authorization)

List Transactions

List transactions with filters.  - **scope**: &#39;personal&#39; (default) or &#39;household&#39; (requires Ultimate/Household membership).

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = TransactionsApi()
val accountId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val category : kotlin.String = category_example // kotlin.String | 
val startDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val endDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val search : kotlin.String = search_example // kotlin.String | Search merchant or description.
val accountType : kotlin.String = accountType_example // kotlin.String | Filter by account type (e.g., 'web3', 'cex', 'traditional')
val excludeAccountTypes : kotlin.String = excludeAccountTypes_example // kotlin.String | Comma-separated list of account types to exclude (e.g., 'web3,cex')
val isManual : kotlin.Boolean = true // kotlin.Boolean | Filter by manual transactions (true) or automated (false)
val sortBy : kotlin.String = sortBy_example // kotlin.String | Sort field and direction: 'ts_desc', 'ts_asc', 'amount_desc', 'amount_asc', 'merchant_asc', 'merchant_desc'
val scope : kotlin.String = scope_example // kotlin.String | personal or household
val page : kotlin.Int = 56 // kotlin.Int | 
val pageSize : kotlin.Int = 56 // kotlin.Int | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : TransactionListResponse = apiInstance.listTransactionsApiTransactionsGet(accountId, category, startDate, endDate, search, accountType, excludeAccountTypes, isManual, sortBy, scope, page, pageSize, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling TransactionsApi#listTransactionsApiTransactionsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling TransactionsApi#listTransactionsApiTransactionsGet")
    e.printStackTrace()
}
```

### Parameters
| **accountId** | **java.util.UUID**|  | [optional] |
| **category** | **kotlin.String**|  | [optional] |
| **startDate** | **java.time.LocalDate**|  | [optional] |
| **endDate** | **java.time.LocalDate**|  | [optional] |
| **search** | **kotlin.String**| Search merchant or description. | [optional] |
| **accountType** | **kotlin.String**| Filter by account type (e.g., &#39;web3&#39;, &#39;cex&#39;, &#39;traditional&#39;) | [optional] |
| **excludeAccountTypes** | **kotlin.String**| Comma-separated list of account types to exclude (e.g., &#39;web3,cex&#39;) | [optional] |
| **isManual** | **kotlin.Boolean**| Filter by manual transactions (true) or automated (false) | [optional] |
| **sortBy** | **kotlin.String**| Sort field and direction: &#39;ts_desc&#39;, &#39;ts_asc&#39;, &#39;amount_desc&#39;, &#39;amount_asc&#39;, &#39;merchant_asc&#39;, &#39;merchant_desc&#39; | [optional] |
| **scope** | **kotlin.String**| personal or household | [optional] [default to &quot;personal&quot;] |
| **page** | **kotlin.Int**|  | [optional] [default to 1] |
| **pageSize** | **kotlin.Int**|  | [optional] [default to 50] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**TransactionListResponse**](TransactionListResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="searchTransactionsApiTransactionsSearchGet"></a>
# **searchTransactionsApiTransactionsSearchGet**
> TransactionListResponse searchTransactionsApiTransactionsSearchGet(q, accountId, category, startDate, endDate, accountType, excludeAccountTypes, isManual, sortBy, page, pageSize, authorization)

Search Transactions

Search transactions using PostgreSQL full-text search.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = TransactionsApi()
val q : kotlin.String = q_example // kotlin.String | Search term
val accountId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val category : kotlin.String = category_example // kotlin.String | 
val startDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val endDate : java.time.LocalDate = 2013-10-20 // java.time.LocalDate | 
val accountType : kotlin.String = accountType_example // kotlin.String | Filter by account type (e.g., 'web3', 'cex', 'traditional')
val excludeAccountTypes : kotlin.String = excludeAccountTypes_example // kotlin.String | Comma-separated list of account types to exclude (e.g., 'web3,cex')
val isManual : kotlin.Boolean = true // kotlin.Boolean | Filter by manual transactions (true) or automated (false)
val sortBy : kotlin.String = sortBy_example // kotlin.String | Sort field and direction: 'ts_desc', 'ts_asc', 'amount_desc', 'amount_asc', 'merchant_asc', 'merchant_desc'
val page : kotlin.Int = 56 // kotlin.Int | 
val pageSize : kotlin.Int = 56 // kotlin.Int | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : TransactionListResponse = apiInstance.searchTransactionsApiTransactionsSearchGet(q, accountId, category, startDate, endDate, accountType, excludeAccountTypes, isManual, sortBy, page, pageSize, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling TransactionsApi#searchTransactionsApiTransactionsSearchGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling TransactionsApi#searchTransactionsApiTransactionsSearchGet")
    e.printStackTrace()
}
```

### Parameters
| **q** | **kotlin.String**| Search term | |
| **accountId** | **java.util.UUID**|  | [optional] |
| **category** | **kotlin.String**|  | [optional] |
| **startDate** | **java.time.LocalDate**|  | [optional] |
| **endDate** | **java.time.LocalDate**|  | [optional] |
| **accountType** | **kotlin.String**| Filter by account type (e.g., &#39;web3&#39;, &#39;cex&#39;, &#39;traditional&#39;) | [optional] |
| **excludeAccountTypes** | **kotlin.String**| Comma-separated list of account types to exclude (e.g., &#39;web3,cex&#39;) | [optional] |
| **isManual** | **kotlin.Boolean**| Filter by manual transactions (true) or automated (false) | [optional] |
| **sortBy** | **kotlin.String**| Sort field and direction: &#39;ts_desc&#39;, &#39;ts_asc&#39;, &#39;amount_desc&#39;, &#39;amount_asc&#39;, &#39;merchant_asc&#39;, &#39;merchant_desc&#39; | [optional] |
| **page** | **kotlin.Int**|  | [optional] [default to 1] |
| **pageSize** | **kotlin.Int**|  | [optional] [default to 50] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**TransactionListResponse**](TransactionListResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a id="updateTransactionApiTransactionsTransactionIdPatch"></a>
# **updateTransactionApiTransactionsTransactionIdPatch**
> TransactionResponse updateTransactionApiTransactionsTransactionIdPatch(transactionId, transactionUpdate, authorization)

Update Transaction

Update transaction fields.  For manual transactions, all fields (amount, merchant_name, ts, category, description) can be updated. For automated transactions, only category and description can be updated.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = TransactionsApi()
val transactionId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val transactionUpdate : TransactionUpdate =  // TransactionUpdate | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : TransactionResponse = apiInstance.updateTransactionApiTransactionsTransactionIdPatch(transactionId, transactionUpdate, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling TransactionsApi#updateTransactionApiTransactionsTransactionIdPatch")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling TransactionsApi#updateTransactionApiTransactionsTransactionIdPatch")
    e.printStackTrace()
}
```

### Parameters
| **transactionId** | **java.util.UUID**|  | |
| **transactionUpdate** | [**TransactionUpdate**](TransactionUpdate.md)|  | |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**TransactionResponse**](TransactionResponse.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

