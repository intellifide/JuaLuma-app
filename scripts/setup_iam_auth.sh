#!/bin/bash
set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-jualuma-dev}"
INSTANCE_NAME="${INSTANCE_NAME:-jualuma-db-10g}"
# Default SA for the application if known, else ask user
APP_SA_EMAIL="jualuma-dev-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Using Project: $PROJECT_ID"
echo "Target Instance: $INSTANCE_NAME"

# 1. Enable IAM Authentication Flag
echo "Checking/Enabling 'cloudsql.iam_authentication' flag..."
CURRENT_FLAGS=$(gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID --format="value(settings.databaseFlags)")

if [[ $CURRENT_FLAGS == *"cloudsql.iam_authentication=on"* ]]; then
    echo "IAM Authentication flag already enabled."
else
    echo "Enabling IAM Authentication flag. WARNING: This might trigger an instance restart."
    echo "Command to run:"
    echo "gcloud sql instances patch $INSTANCE_NAME --project=$PROJECT_ID --database-flags=cloudsql.iam_authentication=on"
fi

# 2. Create Database User for IAM Service Account
# The username for IAM SA is the email without .gserviceaccount.com usually?
# No, for PostgreSQL, it is the email address but often truncated or specific format.
# For Cloud SQL Postgres: "The Cloud IAM user's email address"
# BUT we need to create it in the database AND in Cloud SQL users list.

# Truncate .gserviceaccount.com for Postgres username
DB_USER_NAME=${APP_SA_EMAIL%".gserviceaccount.com"}

echo "Creating Cloud SQL User for IAM SA: $DB_USER_NAME"
# This creates the user in Cloud SQL (IAM type)
gcloud sql users create $DB_USER_NAME \
    --instance=$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --type=cloud_iam_service_account || echo "User might already exist."

# 3. Grant Database Permissions
echo "Granting DB permissions requiring psql..."
echo "Run the following SQL as admin:"
echo "GRANT cloudsqlsuperuser TO \"$DB_USER_NAME\"; -- (Or specific roles)"

# 4. Grant IAM Role to SA
echo "Granting 'roles/cloudsql.instanceUser' to the Service Account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${APP_SA_EMAIL}" \
    --role="roles/cloudsql.instanceUser" \
    --condition=None

echo "IAM Auth Setup Complete (Script-side). Ensure application uses IAM token for password."
