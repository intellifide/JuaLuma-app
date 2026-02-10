// Core Purpose: Shared transaction category list for consistent UI options.
// Last Updated: 2026-01-24 01:12 CST

export const TRANSACTION_CATEGORIES = [
  "Housing",
  "Transportation",
  "Food",
  "Utilities",
  "Insurance",
  "Healthcare",
  "Savings",
  "Personal",
  "Entertainment",
  "Other",
  "Income",
  "Transfer",
  "Groceries",
  "Dining",
  "Travel",
  "Education",
  "Shopping",
  "Credit Card Payment",
  "Investment",
];

export const CATEGORY_EMOJI: Record<string, string> = {
  Housing: "🏠",
  Transportation: "🚗",
  Food: "🍔",
  Utilities: "💡",
  Insurance: "🛡️",
  Healthcare: "🩺",
  Savings: "💰",
  Personal: "👤",
  Entertainment: "🎬",
  Other: "🧩",
  Income: "💵",
  Transfer: "🔄",
  Groceries: "🛒",
  Dining: "🍽️",
  Travel: "✈️",
  Education: "🎓",
  Shopping: "🛍️",
  "Credit Card Payment": "💳",
  Investment: "📈",
  Uncategorized: "🏷️",
}

export const getCategoryEmoji = (rawCategory: string | null | undefined): string | null => {
  if (!rawCategory) return null

  const normalized = rawCategory.trim().toLowerCase()

  const canonicalCategory = (() => {
    if (normalized === "housing" || normalized === "rent" || normalized === "mortgage") return "Housing"

    if (
      normalized === "transportation" ||
      normalized === "transport" ||
      normalized === "transit" ||
      normalized === "car" ||
      normalized === "gas"
    ) {
      return "Transportation"
    }

    if (normalized === "food" || normalized === "food & drink" || normalized === "food and drink") return "Food"

    if (
      normalized === "utilities" ||
      normalized === "bills & utilities" ||
      normalized === "bills and utilities" ||
      normalized === "bills"
    ) {
      return "Utilities"
    }

    if (normalized === "insurance") return "Insurance"

    if (normalized === "healthcare" || normalized === "health") return "Healthcare"

    if (normalized === "savings") return "Savings"

    if (normalized === "personal" || normalized === "home improvement") return "Personal"

    if (normalized === "entertainment" || normalized === "fun") return "Entertainment"

    if (normalized === "other" || normalized === "miscellaneous" || normalized === "misc") return "Other"

    if (normalized === "income") return "Income"

    if (normalized === "transfer") return "Transfer"

    if (normalized === "groceries") return "Groceries"

    if (normalized === "dining" || normalized === "restaurants" || normalized === "restaurant") return "Dining"

    if (normalized === "travel") return "Travel"

    if (normalized === "education") return "Education"

    if (normalized === "shopping") return "Shopping"

    if (normalized === "credit card payment" || normalized === "credit card") return "Credit Card Payment"

    if (normalized === "investment" || normalized === "investments") return "Investment"

    if (normalized === "uncategorized" || normalized === "unknown") return "Uncategorized"

    return null
  })()

  if (!canonicalCategory) return null
  return CATEGORY_EMOJI[canonicalCategory] ?? null
}
