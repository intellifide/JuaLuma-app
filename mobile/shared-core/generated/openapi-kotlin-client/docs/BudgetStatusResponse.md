
# BudgetStatusResponse

## Properties
| Name | Type | Description | Notes |
| ------------ | ------------- | ------------- | ------------- |
| **budgetOwnerUid** | **kotlin.String** |  |  |
| **counts** | **kotlin.collections.Map&lt;kotlin.String, kotlin.Int&gt;** |  |  |
| **items** | [**kotlin.collections.List&lt;BudgetStatusItem&gt;**](BudgetStatusItem.md) |  |  |
| **percentUsed** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **scope** | [**inline**](#Scope) |  |  |
| **spendUids** | **kotlin.collections.List&lt;kotlin.String&gt;** |  |  |
| **totalBudget** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |
| **totalSpent** | [**java.math.BigDecimal**](java.math.BigDecimal.md) |  |  |


<a id="Scope"></a>
## Enum: scope
| Name | Value |
| ---- | ----- |
| scope | personal, household |



