#!/bin/bash
set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-jualuma-dev}"
# Try to detect instance or set default
INSTANCE_NAME="${INSTANCE_NAME:-jualuma-db}"

echo "Using Project: $PROJECT_ID"
echo "Target Instance: $INSTANCE_NAME"

# 1. Get Service Account
echo "Fetching Service Account email..."
SA_EMAIL=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format="value(serviceAccountEmailAddress)")
echo "Service Account: $SA_EMAIL"

# 2. Grant IAM Roles
echo "Granting Vertex AI User role to Cloud SQL Service Account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/aiplatform.user" \
    --condition=None

# 3. Enable Database Flags
echo "Checking/Enabling 'cloudsql.enable_google_ml_integration' flag..."
CURRENT_FLAGS=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format="value(settings.databaseFlags)")

if [[ $CURRENT_FLAGS == *"cloudsql.enable_google_ml_integration=on"* ]]; then
    echo "Flag already enabled."
else
    echo "Enabling flag. WARNING: This triggers an instance restart."
    # Appending to existing flags is complex in bash without wiping others unless we use 'patch' carefully
    # simpler to just add it if strictly needed, but let's warn user to run this manually if unsure
    echo "Run the following command to enable the flag (will restart instance):"
    echo "gcloud sql instances patch $INSTANCE_NAME --project=$PROJECT_ID --database-flags=cloudsql.enable_google_ml_integration=on"
    
    # Uncomment to auto-run if approved
    # gcloud sql instances patch $INSTANCE_NAME --project=$PROJECT_ID --database-flags=cloudsql.enable_google_ml_integration=on
fi

echo "Setup complete. Now connect to the DB and run 'scripts/enable_vector_assist.sql'."
