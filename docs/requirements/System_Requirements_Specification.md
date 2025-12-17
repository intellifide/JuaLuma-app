# System Requirements Specification (SyRS)

## 1. Introduction
This document specifies the system-level requirements for the JuaLuma Application, including hardware, software, and communication interfaces for both development and production environments.

## 2. System Architecture
The system follows a microservices-lite architecture primarily hosted on Google Cloud Platform (GCP).

### 2.1 Diagrams
*   **Compute**: Serverless Containers (Cloud Run).
*   **Data Persistence**: Polyglot persistence using Relational (Cloud SQL) and Document (Firestore) stores.
*   **Event Bus**: Asynchronous logic via Pub/Sub.

## 3. Hardware & Cloud Requirements

### 3.1 Production Environment (GCP)
*   **Compute**:
    *   **Backend**: Google Cloud Run (Serverless), Python 3.11 Runtime.
    *   **Frontend**: Google Cloud Storage + Cloud CDN (Static PWA Hosting).
*   **Database**:
    *   **Primary**: Cloud SQL Enterprise Plus (PostgreSQL 16) with `pgvector` extension.
    *   **Cache/Metering**: Firestore (Datastore Mode).
*   **Storage**: Google Cloud Storage (Standard class for artifacts, Coldline for logs).
*   **Security**: Secret Manager (API Keys), Cloud KMS (Encryption Keys).
*   **Networking**: global HTTPS Load Balancer, Cloud Armor WAF, Private Service Connect.

### 3.2 Local Development Environment
*   **Container Runtime**: Docker Desktop / OrbStack.
*   **Orchestration**: `docker-compose`.
*   **Minimum Specs**:
    *   CPU: 4+ Cores.
    *   RAM: 8GB+ (Recommended 16GB for AI models).
    *   Disk: 20GB free space.

## 4. Software Interfaces

### 4.1 Operating Systems
*   **Server**: Linux (Containerized via distroless or slim images).
*   **Client**: Modern Web Browsers (Chrome 90+, Safari 15+, Firefox 90+, Edge).
*   **Mobile**: iOS 15+, Android 12+ (via Capacitor Wrapper).

### 4.2 Database Interfaces
*   **PostgreSQL**:
    *   Version: 16+
    *   Extensions: `pgvector`, `pgcrypto`.
    *   Connection: Async (`asyncpg`).
*   **Firestore**:
    *   Mode: Datastore Mode.
    *   Emulator compatible.

## 5. Communication Interfaces

### 5.1 Internal
*   **API Protocol**: REST (OpenAPI 3.1).
*   **Event Bus**: Google Cloud Pub/Sub (Protobuf/Avro schemas).
*   **RPC**: gRPC for internal GCP service communication where applicable.

### 5.2 External Integrations
*   **Financial Data**:
    *   **Plaid**: Link, Investments, Liabilities APIs (Webhooks supported).
    *   **CEX/Web3**: REST APIs for CoinGecko, Etherscan, etc.
*   **Billing**:
    *   **Stripe**: Checkout Sessions, Customer Portal, Webhooks.
*   **AI**:
    *   **Google Vertex AI**: Gemini Pro/Flash Models (Production).
    *   **Google AI Studio**: Gemini Flash (Development).
*   **Notifications**:
    *   **SendGrid**: Transactional Email.
    *   **Twilio**: Programmable SMS.

## 6. Non-Functional Requirements (System Level)

### 6.1 Performance
*   **Latency**: API p95 < 500ms for read operations.
*   **Scalability**: Cloud Run autoscaling (0 to N instances).
*   **Database**: Connection pooling via SQLAlchemy/Pgbouncer.

### 6.2 Security
*   **Zero Trust**: All internal services require authentication (OIDC).
*   **Data Rest**: CMEK encryption for DB and Buckets.
*   **Data Transit**: TLS 1.3 enforcement.

### 6.3 Reliability
*   **Availability**: 99.9% uptime target.
*   **Disaster Recovery**: Cross-region backups (US-Central1 -> US-East1).
