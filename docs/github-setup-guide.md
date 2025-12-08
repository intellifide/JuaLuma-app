# GitHub Setup & CI/CD Configuration Guide


---

## Overview

This guide walks you through setting up GitHub authentication, repository configuration, and CI/CD workflows for the Finity app using your GitHub Pro account (TCoder920x).

---

## Repository Configuration

### Current Setup
- **Repository**: `github.com/TCoder920x/finity-app`
- **Account**: TCoder920x (GitHub Pro - Student Pack)
- **Visibility**: Private
- **Branches**: 
  - `main` (production)
  - `Dev` (development)

### Verify Remote Configuration

Check your current remote:
```bash
git remote -v
```

Should show:
```
origin	https://github.com/TCoder920x/finity-app.git (fetch)
origin	https://github.com/TCoder920x/finity-app.git (push)
```

If it doesn't match, update it:
```bash
git remote set-url origin https://github.com/TCoder920x/finity-app.git
```

---

## GitHub Authentication Setup

### Option 1: GitHub CLI (Recommended)

1. **Install GitHub CLI** (if not already installed):
   ```bash
   # macOS
   brew install gh
   
   # Verify installation
   gh --version
   ```

2. **Authenticate with TCoder920x account**:
   ```bash
   gh auth login
   ```
   
   Follow the prompts:
   - Choose "GitHub.com"
   - Choose "HTTPS" or "SSH" (SSH recommended)
   - Authenticate via web browser or token
   - Select account: **TCoder920x**

3. **Verify authentication**:
   ```bash
   gh auth status
   ```

4. **Set default account** (if needed):
   ```bash
   gh auth switch --user TCoder920x
   ```

### Option 2: SSH Keys

1. **Generate SSH key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Add SSH key to GitHub**:
   - Copy public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste key and save

3. **Test connection**:
   ```bash
   ssh -T git@github.com
   ```

4. **Update remote to use SSH**:
   ```bash
   git remote set-url origin git@github.com:TCoder920x/finity-app.git
   ```

### Option 3: Personal Access Token (PAT)

1. **Create PAT**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `workflow`, `read:org`
   - Generate and copy token

2. **Use token for authentication**:
   ```bash
   git remote set-url origin https://TCoder920x:YOUR_TOKEN@github.com/TCoder920x/finity-app.git
   ```

   **Note**: This embeds the token in the remote URL. Consider using credential helper instead.

---

## Repository Creation

If the repository doesn't exist on TCoder920x account:

1. **Create repository via GitHub CLI**:
   ```bash
   gh repo create finity-app --private --source=. --remote=origin --push
   ```

2. **Or create via GitHub Web UI**:
   - Go to: https://github.com/new
   - Repository name: `finity-app`
   - Visibility: **Private**
   - Don't initialize with README (we already have files)
   - Click "Create repository"
   - Then push existing code:
     ```bash
     git remote add origin https://github.com/TCoder920x/finity-app.git
     git push -u origin main
     git push -u origin Dev
     ```

---

## GitHub Actions CI/CD Setup

### Required Secrets

Add these secrets to your repository:
- Go to: `https://github.com/TCoder920x/finity-app/settings/secrets/actions`
- Click "New repository secret"

**Required Secrets:**
1. `STRIPE_SECRET_KEY`: Your Stripe test secret key (`sk_test_...`)
2. `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (get from Stripe Dashboard after creating webhook endpoint)
3. `POSTMAN_API_KEY`: Your Postman API key (for Newman CLI in CI)
4. `TESTMAIL_API_KEY`: Your Testmail API key (for email testing in CI)
5. `CODECOV_TOKEN`: (Optional) Codecov token if using coverage reporting

**How to get secrets:**
- **Stripe**: Dashboard → Developers → API keys
- **Stripe Webhook Secret**: Dashboard → Developers → Webhooks → [Your endpoint] → Reveal signing secret
- **Postman**: Settings → API Keys → Generate new key
- **Testmail**: Dashboard → API Keys

### Stripe Webhook Setup (required)
1) **Log in to Stripe CLI** (interactive):
```bash
stripe login
```
2) **Start listener (official guidance)**:
```bash
stripe listen --forward-to localhost:4242/webhook
# or: ./scripts/setup-stripe-webhook.sh
```
3) **Copy the webhook signing secret** shown as `whsec_...` and set it in:
   - `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`
   - GitHub Secrets: `STRIPE_WEBHOOK_SECRET`
4) **Test**:
```bash
stripe trigger payment_intent.succeeded
```

### Create GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, Dev]
  pull_request:
    branches: [main, Dev]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install Python dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Lint with Ruff
        run: |
          pip install ruff
          ruff check .
      
      - name: Type check with mypy
        run: |
          pip install mypy
          mypy .
      
      - name: Run tests
        run: |
          pytest
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      
      - name: Install Newman
        run: |
          npm install -g newman
      
      - name: Run Postman collections
        run: |
          newman run postman/collections/finity-api.json \
            --environment postman/environments/local.json \
            --api-key ${{ secrets.POSTMAN_API_KEY }}
        continue-on-error: true
```

### Workflow Status

- View workflows: `https://github.com/TCoder920x/finity-app/actions`
- Workflows run automatically on push/PR
- Green checkmark = all checks passed
- Red X = checks failed (review logs)

---

## Branch Protection (Optional but Recommended)

Protect the `main` branch:

1. Go to: `https://github.com/TCoder920x/finity-app/settings/branches`
2. Click "Add rule" for `main` branch
3. Enable:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

---

## Verification Checklist

- [ ] Repository remote points to `github.com/TCoder920x/finity-app`
- [ ] GitHub CLI authenticated as TCoder920x (`gh auth status`)
- [ ] Repository is private
- [ ] Both `main` and `Dev` branches exist and are pushed
- [ ] GitHub Actions secrets are configured
- [ ] CI workflow file exists (`.github/workflows/ci.yml`)
- [ ] Test push triggers workflow successfully

---

## Troubleshooting

### Authentication Issues

**Problem**: `gh auth login` fails
- **Solution**: Try `gh auth login --web` for browser-based authentication

**Problem**: Wrong account authenticated
- **Solution**: `gh auth switch --user TCoder920x`

### Repository Access Issues

**Problem**: Can't push to repository
- **Solution**: Verify remote URL and authentication:
  ```bash
  git remote -v
  gh auth status
  ```

**Problem**: Repository doesn't exist
- **Solution**: Create it first (see "Repository Creation" above)

### GitHub Actions Issues

**Problem**: Workflows not running
- **Solution**: 
  - Check Actions tab is enabled: Settings → Actions → General
  - Verify workflow file syntax (YAML)
  - Check branch name matches workflow trigger

**Problem**: Secrets not found
- **Solution**: Verify secrets are added in Settings → Secrets and variables → Actions

---

## Next Steps

After setup is complete:

1. **Test CI/CD**: Make a small change, push to `Dev` branch, verify workflow runs
2. **Set up Stripe webhook**: See `scripts/setup-stripe-webhook.sh`
3. **Configure Postman collections**: Export collections to `postman/` directory
4. **Review tech stack**: See `docs/tech-stack.md`

---

**Repository**: `github.com/TCoder920x/finity-app`  
**Account**: TCoder920x (GitHub Pro)  
**CI/CD**: GitHub Actions

**Last Updated:** December 07, 2025 at 08:39 PM
