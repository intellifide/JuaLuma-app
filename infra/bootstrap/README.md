# Terraform Bootstrap (State Backend)

This folder bootstraps the Terraform **state backend** for a given GCP project:

- **Cloud KMS** key ring + crypto key (for CMEK)
- **GCS bucket** for Terraform state (versioned, UBLA, public access prevention, CMEK-encrypted)

This is intentionally separate from `infra/envs/*` because you cannot use a remote backend that does not exist yet.

If you already have a KMS key (common), you can set `kms_crypto_key_id` and skip creating new KMS resources.

## Usage (per project)

1. Authenticate to the target project (ADC recommended):

```bash
gcloud auth application-default login
gcloud config set project <PROJECT_ID>
```

2. Initialize and apply bootstrap:

```bash
cd infra/bootstrap
terraform init
terraform apply
```

3. Configure each environment to use the backend:

- Copy `infra/envs/dev/backend.tf.example` to `infra/envs/dev/backend.tf`
- Copy `infra/envs/stage/backend.tf.example` to `infra/envs/stage/backend.tf`
- Copy `infra/envs/prod/backend.tf.example` to `infra/envs/prod/backend.tf`

If the bucket/key already exist (likely), import instead of creating duplicates:

```bash
terraform import google_storage_bucket.tf_state <BUCKET_NAME>
terraform import google_kms_key_ring.tf_state projects/<PROJECT_ID>/locations/<LOCATION>/keyRings/<KEY_RING_NAME>
terraform import google_kms_crypto_key.tf_state projects/<PROJECT_ID>/locations/<LOCATION>/keyRings/<KEY_RING_NAME>/cryptoKeys/<KEY_NAME>
```
