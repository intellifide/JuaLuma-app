# DocumentsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**downloadDocumentApiDocumentsDocIdDownloadGet**](DocumentsApi.md#downloadDocumentApiDocumentsDocIdDownloadGet) | **GET** /api/documents/{doc_id}/download | Download Document |
| [**listDocumentsApiDocumentsGet**](DocumentsApi.md#listDocumentsApiDocumentsGet) | **GET** /api/documents/ | List Documents |
| [**previewDocumentApiDocumentsDocIdPreviewGet**](DocumentsApi.md#previewDocumentApiDocumentsDocIdPreviewGet) | **GET** /api/documents/{doc_id}/preview | Preview Document |
| [**uploadDocumentApiDocumentsUploadPost**](DocumentsApi.md#uploadDocumentApiDocumentsUploadPost) | **POST** /api/documents/upload | Upload Document |


<a id="downloadDocumentApiDocumentsDocIdDownloadGet"></a>
# **downloadDocumentApiDocumentsDocIdDownloadGet**
> kotlin.Any downloadDocumentApiDocumentsDocIdDownloadGet(docId, authorization)

Download Document

Download a specific document.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DocumentsApi()
val docId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.downloadDocumentApiDocumentsDocIdDownloadGet(docId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DocumentsApi#downloadDocumentApiDocumentsDocIdDownloadGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DocumentsApi#downloadDocumentApiDocumentsDocIdDownloadGet")
    e.printStackTrace()
}
```

### Parameters
| **docId** | **java.util.UUID**|  | |
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

<a id="listDocumentsApiDocumentsGet"></a>
# **listDocumentsApiDocumentsGet**
> kotlin.Any listDocumentsApiDocumentsGet(authorization)

List Documents

List all documents for the current user.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DocumentsApi()
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.listDocumentsApiDocumentsGet(authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DocumentsApi#listDocumentsApiDocumentsGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DocumentsApi#listDocumentsApiDocumentsGet")
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

<a id="previewDocumentApiDocumentsDocIdPreviewGet"></a>
# **previewDocumentApiDocumentsDocIdPreviewGet**
> kotlin.Any previewDocumentApiDocumentsDocIdPreviewGet(docId, authorization)

Preview Document

Get preview URL or content for a document.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DocumentsApi()
val docId : java.util.UUID = 38400000-8cf0-11bd-b23e-10b96e4ef00d // java.util.UUID | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.previewDocumentApiDocumentsDocIdPreviewGet(docId, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DocumentsApi#previewDocumentApiDocumentsDocIdPreviewGet")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DocumentsApi#previewDocumentApiDocumentsDocIdPreviewGet")
    e.printStackTrace()
}
```

### Parameters
| **docId** | **java.util.UUID**|  | |
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

<a id="uploadDocumentApiDocumentsUploadPost"></a>
# **uploadDocumentApiDocumentsUploadPost**
> kotlin.Any uploadDocumentApiDocumentsUploadPost(file, type, authorization)

Upload Document

Upload a new document.

### Example
```kotlin
// Import classes:
//import com.intellifide.jualuma.sharedcore.api.infrastructure.*
//import com.intellifide.jualuma.sharedcore.api.models.*

val apiInstance = DocumentsApi()
val file : java.io.File = BINARY_DATA_HERE // java.io.File | 
val type : kotlin.String = type_example // kotlin.String | 
val authorization : kotlin.String = authorization_example // kotlin.String | 
try {
    val result : kotlin.Any = apiInstance.uploadDocumentApiDocumentsUploadPost(file, type, authorization)
    println(result)
} catch (e: ClientException) {
    println("4xx response calling DocumentsApi#uploadDocumentApiDocumentsUploadPost")
    e.printStackTrace()
} catch (e: ServerException) {
    println("5xx response calling DocumentsApi#uploadDocumentApiDocumentsUploadPost")
    e.printStackTrace()
}
```

### Parameters
| **file** | **java.io.File**|  | |
| **type** | **kotlin.String**|  | [optional] [default to &quot;uploaded&quot;] |
| Name | Type | Description  | Notes |
| ------------- | ------------- | ------------- | ------------- |
| **authorization** | **kotlin.String**|  | [optional] |

### Return type

[**kotlin.Any**](kotlin.Any.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json

