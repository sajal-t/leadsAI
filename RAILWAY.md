# Deploy LeadForge on Railway (with lead scraper)

Railway runs **one Docker container** that includes:

- Next.js app
- `google-maps-scraper` binary + Chromium (from `gosom/google-maps-scraper`)

Supabase stays on [supabase.co](https://supabase.com) — Railway only hosts the app.

## 1. Push to GitHub

Railway deploys from your repo. Root folder must be `locallead-ai` (where `package.json` and `Dockerfile` live).

## 2. Create Railway service

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the repo
3. Railway detects `Dockerfile` + `railway.toml` automatically

**First build takes ~10–15 minutes** (pulls scraper image + `npm run build`).

## 3. Service settings

### Resources (important for Find leads)

- **Memory: at least 2 GB** (scraper + Chromium are heavy)
- CPU: 2 vCPU recommended if searches feel slow

### Environment variables

Copy from local `.env.local`, then set production values:

```env
# Site
NEXT_PUBLIC_SITE_URL=https://leadforgelabs.org

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Scraper (defaults are baked into Dockerfile — only change if needed)
MAPS_SCRAPER_ENABLED=true
MAPS_SCRAPER_BIN=/usr/local/bin/google-maps-scraper
MAPS_SCRAPER_RESULTS_DIR=/tmp/maps-scraper-results
MAPS_SCRAPER_MODE=cli
MAPS_SCRAPER_TIMEOUT_MS=300000

# Do NOT use Docker-in-Docker on Railway
MAPS_SCRAPER_DOCKER_ENABLED=false

# AI / email / etc. (your existing keys)
OPENAI_API_KEY=...
HF_TOKEN=...
```

**Do not set** on production unless testing:

- `BILLING_DISABLED`
- `ALLOW_MOCK_BILLING`

### Stripe (when ready)

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
```

## 4. Custom domain

1. Railway → service → **Settings → Networking → Custom Domain** → add `leadforgelabs.org`
2. Spaceship DNS → CNAME (or A record Railway shows)
3. Wait for SSL (automatic)

## 5. Supabase auth URLs

**Authentication → URL configuration:**

- Site URL: `https://leadforgelabs.org`
- Redirect URLs:
  - `https://leadforgelabs.org/auth/callback`

Run all SQL migrations (`supabase/migrations/001` … `014`) in the Supabase SQL editor.

## 6. Verify scraper after deploy

1. Log in to the app
2. Open browser devtools → Network, or visit while logged in:
   - `GET /api/lead-discovery/providers`
   - Expect: `enabled: true`, `binary_configured: true`, `mode: "cli"`
3. Create a campaign → **Find leads**
4. Watch Railway **Deploy logs** for scraper output or errors

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Build fails pulling `gosom/google-maps-scraper` | Retry deploy; check Railway build logs |
| `Scraper binary not found` | `MAPS_SCRAPER_BIN=/usr/local/bin/google-maps-scraper` |
| Playwright / browser errors | Bump memory to **2 GB+**; redeploy |
| Search times out | Increase `MAPS_SCRAPER_TIMEOUT_MS=600000` |
| Auth redirect fails | Fix Supabase Site URL + redirect URLs |

## Local Docker test (optional)

```bash
docker build -t leadforge .
docker run --rm -p 3000:3000 --env-file .env.local leadforge
```

Use production-like `NEXT_PUBLIC_SITE_URL` in the env file you pass.
