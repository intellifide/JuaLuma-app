#!/bin/bash

# Instructions for enabling Managed Connection Pooling (PgBouncer) via Cloud Run Sidecar
# OR using the new "Cloud SQL generic connection pool" if available in preview.
# Currently, the best practice for Cloud Run + Cloud SQL is using the Cloud SQL Auth Proxy which has built-in connection limits,
# BUT for actual pooling, a PgBouncer sidecar is recommended if opening many connections.

echo "Deploying PgBouncer Sidecar configuration..."

# We assume a service.yaml or cloudbuild.yaml exists.
# If not, we provide a snippet to add to the Cloud Run service definition.

cat <<EOF
Add the following container to your Cloud Run service definition (in 'containers' list):

- name: pgbouncer
  image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.2 # Using Auth Proxy v2 often sufficient
  # OR use pgbouncer image:
  # image: edoburu/pgbouncer
  args:
    - "/cloud_sql_proxy"
    - "-instances=${PROJECT_ID}:${REGION}:${INSTANCE_NAME}=tcp:5432"
    # To enable pooling, you might need actual pgbouncer image.
    
# Recommendation:
# Use Cloud SQL Auth Proxy v2 in sidecar mode.
# It handles connection multiplexing efficiently.
# If you need transaction pooling specifically, deploy a dedicated PgBouncer service or sidecar.

# Command to deploy sidecar with existing service:
# gcloud run services update SERVICE_NAME --add-cloudsql-instances=${PROJECT_ID}:${REGION}:${INSTANCE_NAME}

EOF

echo "For this task, we recommend ensuring 'Cloud SQL Auth Proxy' is used."
echo "If strictly PgBouncer is needed, please refer to: https://cloud.google.com/sql/docs/postgres/manage-connections#pgbouncer"
