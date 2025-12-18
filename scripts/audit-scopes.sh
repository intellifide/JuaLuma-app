#!/bin/bash
# audit-scopes.sh
# Scans codebase for forbidden Plaid/API scopes (write access, transfers)
# Returns exit code 1 if risky terms found

echo "Starting Security Scope Audit..."

FORBIDDEN_TERMS="payment_initiation|transfer|liabilities|investments_auth|credit_details"

# Exclude this script, git files, and docs
# Search in backend and frontend source
RISKS=$(grep -rE "($FORBIDDEN_TERMS)" \
  --include="*.py" --include="*.ts" --include="*.tsx" \
  --exclude="audit-scopes.sh" \
  backend/ frontend/src/)

if [ -n "$RISKS" ]; then
    echo "❌ SECURITY AUDIT FAILED: Forbidden scopes/terms detected!"
    echo "$RISKS"
    exit 1
else
    echo "✅ Security Audit Passed: No write-access scopes detected."
    exit 0
fi
