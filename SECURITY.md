# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public
GitHub issue. Instead, report it privately via GitHub's
[Security Advisories](../../security/advisories/new) feature or by emailing
the repository maintainers.

---

## Leaked-Secret Remediation

### Background

A historical commit in this repository accidentally tracked
`Apps/PCS-Weather-Earth/.env`, which contained a live OpenWeather API key.

**That key has been revoked.** The file has been removed from tracking (commit
records removed via `git rm --cached`) and all `.env` variants are now covered
by `.gitignore`. Nevertheless, the value still exists in git history. The steps
below permanently remove it.

---

### Step 1 — Revoke the key immediately

Log in to [openweathermap.org](https://home.openweathermap.org/api_keys) and
delete or regenerate the compromised key before doing anything else.

---

### Step 2 — Purge from git history

#### Option A: `git filter-repo` (recommended)

```bash
# Install if needed: pip install git-filter-repo
git filter-repo --path Apps/PCS-Weather-Earth/.env --invert-paths --force
```

This rewrites every commit that ever contained the file.

#### Option B: BFG Repo-Cleaner

```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env --no-blob-protection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

### Step 3 — Verify the purge

```bash
# Should return no output (no commits containing the leaked secret string)
git log -S "<LEAKED_OPENWEATHER_API_KEY>" --all

# Should return no output (file no longer in any commit)
git log --all -- .env
```

---

### Step 4 — Force-push rewritten history

```bash
git push origin --force --all
git push origin --force --tags
```

> ⚠️ Force-pushing rewrites shared history. Every collaborator **must** re-clone
> or reset their local repository after this step.

---

### Step 5 — Collaborator instructions

Each collaborator should run:

```bash
git fetch origin
git reset --hard origin/<branch-name>
# or simply re-clone:
git clone <repo-url>
```

Old local clones will still contain the leaked secret in their `.git/` history
until they reset or re-clone.

---

## Worker Secrets

The Cloudflare Worker uses two secrets that must **never** appear in source
code or committed files:

| Secret                | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `OPENWEATHER_API_KEY` | Authenticate server-side tile requests to OpenWeather |
| `INGEST_SECRET`       | ****** to authorise POST `/ingest/v1`          |

Set them with:

```bash
wrangler secret put OPENWEATHER_API_KEY
wrangler secret put INGEST_SECRET
```

The Worker validates `INGEST_SECRET` on every ingest request and returns
**HTTP 401** for missing or invalid tokens. It returns **HTTP 500** if
`OPENWEATHER_API_KEY` is not configured.

---

## Environment File Rules

| File              | Committed? | Purpose                           |
|-------------------|------------|-----------------------------------|
| `.env`            | ❌ No       | Local overrides — never commit    |
| `.env.local`      | ❌ No       | Machine-local overrides           |
| `.env.production` | ❌ No       | Production values — never commit  |
| `.env.example`    | ✅ Yes      | Placeholder documentation only    |

`.env`, `.env.local`, and `.env.production` are listed in both the root
`.gitignore` and `Apps/PCS-Weather-Earth/.gitignore`.
