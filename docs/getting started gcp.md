# Getting Started with GCP: Cost Optimization & Projections

## GCP Cost Optimization Strategies for jualuma

### 1. Cloud SQL Optimization (Unified Ledger & Metadata)

- **Use Enterprise Plus Edition** for critical production loads (better caching/perf).
- **Start with Single Zone** (99.99% SLA) - Multi-zone only if strictly required.
- **Enable Storage Autoscaling** to start small (10GB) and grow.
- **Architecture:** Cloud SQL Enterprise Plus provides the necessary functionality for unified ledger and metadata storage.

### 2. Firestore Optimization (Metering & Cache)

- **Use Datastore Mode** for high write throughput.
- **Leverage Free Tier:** 50k reads/20k writes per day free.
- **Set TTL Policies:** Auto-delete old cache/metering data to keep storage costs low.
- **Architecture:** Firestore Datastore Mode provides serverless, scalable metering and cache storage.

### 3. Cloud Run Optimization (Compute & Sync)

- **API Services:** Set `min-instances = 0` to scale to zero during inactivity.
- **Sync Jobs:** Use **Cloud Run Jobs** for 2x/day data fetch.
  - Trigger via Cloud Scheduler.
  - Containers run only for the duration of the sync (~5 mins).
  - Zero cost when idle.
- **Savings:** Prevents paying for idle CPU time.

### 4. Log Ledger Optimization (Cloud SQL + Coldline)

- **Dedicated Audit Schema:** Keep `audit.*` tables on the same Cloud SQL instance (separate schema) with `autovacuum_vacuum_scale_factor = 0.01` to prevent bloat on append-only workloads.
- **Monthly Partitioning:** Use declarative partitions on `audit.llm_logs`/`audit.audit_log` so nightly purges and exports only touch the active partition.
- **Hot vs. Cold Retention:** Retain 90 days of logs in Cloud SQL; `log-ledger-archiver` exports Parquet files to `gs://jualuma-log-vault/<table>/<YYYY>/<MM>/<DD>/` for 7-year GLBA retention.
- **Read Replica for Analytics:** If dashboards need heavy queries, attach a `db-custom-1-2` read replica; shut it down off-hours to minimize spend.

### 5. Storage & CDN Optimization

- **Use Cloud Storage Lifecycle Policies:**
  - Exported log Parquet files live in Standard storage for 90 days (mirrors the Cloud SQL hot window)
  - Lifecycle rules move Parquet older than 180 days to Coldline while retaining 7-year history at pennies per GB
- **Enable Cloud CDN Caching Aggressively**
- **Leverage Free Tier:** 5GB storage + 1GB egress/month

### 6. General Optimization Strategies

- **Use Firebase Free Tier:** 50K MAU free for Auth
- **Enable Committed Use Discounts (CUDs)** after 3-6 months when usage stabilizes
- **Use Cloud Scheduler for Batch Jobs** (free tier: 3 jobs/month)
- **Monitor with Cloud Monitoring** (free tier: 150MB metrics/month)

### 7. AI Model Configuration (Local Development vs Production)

**Local Development (Google AI Studio):**

- **Service:** Google AI Studio Gemini 2.5 Flash API (free tier for development)
- **Authentication:** API key stored in local `.env` file as `AI_STUDIO_API_KEY`
- **Rate Limits:** Free tier provides approximately 10 RPM, 250k TPM, 250 RPD
- **Cost:** Free for development purposes (within free-tier limits)
- **Configuration:**
  - Base URL: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
  - Model: `gemini-2.5-flash` (set via `GEMINI_MODEL` environment variable)
  - No Vertex AI project setup required for local development
- **Best Practices:**
  - Implement client-side rate limiting to avoid hitting free-tier quotas
  - Use exponential backoff retry logic for 429 rate limit errors
  - Ensure data logging is disabled in API requests (prompts/responses not stored for training)
  - Never commit API keys to version control

**Production (Vertex AI):**

- **Service:** Vertex AI Gemini (requires GCP project with Vertex AI API enabled)
- **Authentication:** Service account credentials (Application Default Credentials or workload identity)
- **Rate Limits:** Configurable quotas based on paid tier (see Vertex AI quotas documentation)
- **Cost:** Pay-as-you-go pricing (see Vertex AI pricing documentation)
- **Configuration:**
  - Base URL: `https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent`
  - Requires GCP project ID, location, and service account setup
  - Vertex AI Vector Search available for RAG context (Essential/Pro/Ultimate tiers)
- **Migration Path:** Codebase uses configurable transport layer to switch between AI Studio (dev) and Vertex AI (prod) with minimal code changes

---

## Month-by-Month Cost Projection

### Growth Assumptions

- **User Growth:** 50 → 200 → 500 → 1,000 → 2,000 → 4,000 users
- **Pro Tier Conversion:** 10% → 15% → 20% → 25% → 30% → 30%
- **Average Transactions per User:** 50/month (Free), 200/month (Pro)
- **Average API Calls per User:** 20/day (Free), 100/day (Pro)
- **AI Queries:** Pro users only, 30 queries/month average

### Month 1: Launch (50 users, 5 Pro)

| Service | Configuration | Cost |
|---------|--------------|------|
| **Cloud SQL** | db-custom-2-8 (Enterprise Plus) | $80 |
| **Firestore** | Datastore Mode (Free Tier covers usage) | $0 |
| **Cloud Run (API)** | ~50K requests/month | $5 (free tier) |
| **Cloud Run (Jobs)** | 2x daily syncs | $2 |
| **Cloud Functions** | ~10K invocations | $2 (free tier) |
| **Pub/Sub** | ~100K messages | $1 |
| **Log Ledger (Cloud SQL + Coldline)** | Shared audit schema + Parquet export | $3 |
| **Cloud Storage** | 10GB + CDN | $2 (free tier) |
| **Secret Manager** | ~50 secrets | $1 |
| **Cloud KMS** | ~10 keys | $1 |
| **Cloud DLP** | Minimal usage | $5 |
| **Firebase Auth** | 50 users | $0 (free tier) |
| **Network Egress** | 50GB | $5 |
| **Total** | | **~$109/month** |

### Month 2: Early Growth (200 users, 30 Pro)

| Service | Configuration | Cost |
|---------|--------------|------|
| **Cloud SQL** | db-custom-2-8 (Enterprise Plus) | $80 |
| **Firestore** | Low write volume | $5 |
| **Cloud Run** | API + Jobs | $15 |
| **Others** | (Network, DLP, Secrets) | $40 |
| **Total** | | **~$140/month** |

### Month 6: Established (4,000 users, 1,200 Pro)

| Service | Configuration | Cost |
|---------|--------------|------|
| **Cloud SQL** | Scaled instance (4 vCPU, 16GB) | $200 |
| **Firestore** | Moderate write volume | $40 |
| **Cloud Run** | ~4M requests + Heavy Sync Jobs | $150 |
| **Log Ledger (Cloud SQL + Coldline)** | Dedicated audit schema + Coldline exports | $35 |
| **Operations** | Logging/Monitoring | $50 |
| **Security** | DLP/KMS/Secrets | $150 |
| **Network** | Egress | $200 |
| **Total** | | **~$840/month** |

---

## Cost Summary & Optimization Impact

### With Optimizations (Recommended)

- **Month 1:** ~$109/month
- **Month 6:** ~$840/month

### Revenue vs. Costs (Month 6)

- **1,000 Pro users × $18/month avg = $18,000/month revenue**
- **GCP costs: ~$840/month**
- **Net margin: ~$17,160/month (95% margin)**

---

## Infrastructure as Code (IaC) Setup

**Terraform Infrastructure:**

- All GCP infrastructure is managed via Terraform using Google Cloud Foundation Toolkit (CFT) and Fabric modules
- Infrastructure codebase located in `infra/` directory
- State backend: GCS bucket with versioning + KMS encryption
- Environments: prod, stage, dev (separate projects, no peering prod↔non-prod)

**Networking Architecture:**

- VPC per environment with private subnets (app, data, ops)
- Private Service Connect for Google APIs and Cloud SQL (private IP only)
- Cloud NAT for controlled egress with allow-list policies
- HTTPS Load Balancer with Cloud Armor WAF protection
- Cloud CDN for static assets
- Cloud Run ingress restricted to `internal-and-cloud-load-balancing` only

**Security Guardrails:**

- Org policies enforced via Terraform: disable external IPs, disable SA key creation, restrict CMEK projects
- All egress via Cloud NAT with logging
- DNS policy forces `googleapis.com` to PSC endpoints
- Firewall default deny egress; allow-list for third-party APIs

**Deployment Workflow:**

1. Infrastructure changes via Terraform PRs
2. CI runs: `terraform fmt`, `validate`, `tflint`, `tfsec/checkov`, `plan`
3. Manual approval required for applies
4. State locking via GCS prevents concurrent modifications

**Cost Impact:**

- Load Balancer: ~$18/month base + traffic
- Cloud Armor: ~$5/month base + per-request pricing
- Cloud NAT: ~$45/month per NAT gateway + egress charges
- VPC Flow Logs: ~$0.50 per GB ingested
- Cloud CDN: Included with Load Balancer (no additional cost)
- **Estimated additional networking costs: ~$70-100/month** (adds to base infrastructure costs)

#### See `infra/README.md` for detailed setup and usage instructions.

## Action Items for Cost Control

1. **Set Up Billing Alerts** at $200, $500, $1,000 thresholds
2. **Use Cloud Monitoring Dashboards** to track service costs
3. **Review and Optimize Monthly** using GCP Recommender
4. **Apply for Startup Credits** before launch
5. **Monitor Cloud SQL CPU** to right-size instance
6. **Bootstrap Terraform State Backend** (GCS bucket + KMS) before deploying infrastructure
7. **Review Networking Costs** monthly (LB, NAT, Flow Logs) and optimize as needed

---

## Notes

- This projection assumes steady growth. Actual costs may vary ±20% based on usage patterns and optimization implementation.
- All costs are estimates based on 2024 GCP pricing. Actual costs may vary.
- Free tier limits apply to new GCP accounts and may change over time.
- Consider applying for Google Cloud for Startups program for additional credits and support.

---

## Related Documents

This GCP setup guide relates to the following planning documents:

**Business Documents:**

- `Budget-Financial-Planning.md` - Financial planning and GCP cost projections
- `Product-Roadmap.md` - Timeline for infrastructure setup (Phase 1.1)
- `Vendor-Relationships.md` - Vendor setup (GCP account configuration)

**App Development Guides:**

- `Master App Dev Guide.md` - Technical specification (Section 3.0, GCP architecture)
- `Local App Dev Guide.md` - Local development setup (GCP emulator configuration)
- `Security-Architecture.md` - Security architecture (GCP security configuration)

**Technical Documentation:**

- `Security-Architecture.md` - Security architecture (GCP security controls)
- `Data-Flow-Diagrams.md` - Data flow architecture (GCP services)

**Last Updated:** December 19, 2025 at 01:51 PM CT (Modified 12/19/2025 13:51 Central Time per rules)
