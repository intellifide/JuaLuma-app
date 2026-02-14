#!/bin/bash
set -e

# Configuration
# Assuming project and instance from context or defaults
PROJECT_ID="jualuma-dev"
REGION="us-central1"
INSTANCE_NAME="jualuma-db"
CONNECTION_NAME="$PROJECT_ID:$REGION:$INSTANCE_NAME"
PORT=5433

# Download Cloud SQL Proxy if not present
if [ ! -f ./cloud-sql-proxy ]; then
    echo "Downloading Cloud SQL Proxy..."
    curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.2/cloud-sql-proxy.darwin.arm64
    chmod +x cloud-sql-proxy
fi

# Start Proxy
echo "Starting Cloud SQL Proxy for $CONNECTION_NAME on port $PORT..."
./cloud-sql-proxy $CONNECTION_NAME --port $PORT
