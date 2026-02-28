
# BudgetStatusItem

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **budgetAmount** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **category** | **kotlin.String** |  |  |
| **delta** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **percentUsed** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **period** | [**inline**](#Period) |  |  |
| **spent** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **status** | [**inline**](#Status) |  |  |
| **windowEnd** | [**java.time.LocalDate**](java.time.LocalDate.md) |  |  |
| **windowStart** | [**java.time.LocalDate**](java.time.LocalDate.md) |  |  |


<a id="Period"></a>
## Enum: period
| Name | Value |
| ---- | ----- |
| period | monthly, quarterly, annual |


<a id="Status"></a>
## Enum: status
| Name | Value |
| ---- | ----- |
| status | under, at, over |



