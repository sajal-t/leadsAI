# Deploy LeadForge on Railway (with lead scraper)

## If lead search fails on Railway

Check your **build logs**. If you see `Railpack` and `npm run start`, the scraper is **not** installed.

**Fix (required):**

1. Railway → your service → **Settings** → **Build**
2. Set **Builder** to **Dockerfile** (not Railpack)
3. Set **Root Directory** to the folder that contains `Dockerfile` (usually `locallead-ai`)
4. **Redeploy** — build logs should show `FROM gosom/google-maps-scraper`, not `railpack-v0.x`

After deploy, while logged in open `/api/lead-discovery/providers` — you want `binary_present: true` and `ready: true`.

---

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
MAPS_SCRAPER_BIN=/usr/bin/google-maps-scraper
MAPS_SCRAPER_RESULTS_DIR=/tmp/maps-scraper-results
# Do NOT use ./tmp/... on Railway — it becomes /app/tmp and causes EACCES
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

- Site URL: your primary domain (e.g. `https://leadforgelabs.org`)
- Redirect URLs — add **every** URL users open (mobile/desktop):
  - `https://leadforgelabs.org/auth/callback`
  - `https://YOUR-PROJECT.up.railway.app/auth/callback`
  - `http://localhost:3000/auth/callback` (local dev)

Google sign-in uses the **current browser origin** for the callback. If that origin is not in this list, OAuth fails (especially on mobile).

Add signup redirect if using email links:

- `https://leadforgelabs.org/auth/callback`

Run all SQL migrations (`supabase/migrations/001` … `014`) in the Supabase SQL editor.

## 6. Verify scraper after deploy

**Quick probe** (while logged in, in browser console or curl with session cookie):

```bash
curl -X POST https://YOUR-DOMAIN/api/lead-discovery/scraper-probe
```

Success: `{ "ok": true, "rows": <number> }`. Failure returns the real scraper error in `error`.

## 7. Verify in the app

1. Log in to the app
2. Open browser devtools → Network, or visit while logged in:
   - `GET /api/lead-discovery/providers`
   - Expect: `enabled: true`, `binary_configured: true`, `mode: "cli"`
3. Create a campaign → **Find leads**
4. Watch Railway **Deploy logs** for scraper output or errors

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Build log says **Railpack** / `npm run start` | Switch builder to **Dockerfile** (see top of this doc) |
| `binary_present: false` in `/api/lead-discovery/providers` | Same — Dockerfile deploy; set `MAPS_SCRAPER_BIN=/usr/bin/google-maps-scraper` |
| `EACCES: permission denied, mkdir '/app/tmp'` | Set `MAPS_SCRAPER_RESULTS_DIR=/tmp/maps-scraper-results` (not `./tmp/...`) and redeploy |
| Generic “couldn't complete” after deploy | Redeploy latest Dockerfile (runs on `gosom` base); run scraper-probe; check Railway logs for `[maps-scraper]` |
| `open /opt/LICENSE: permission denied` | Redeploy latest Dockerfile (`chown` on `/opt` for `nextjs` user) |
| `MAPS_SCRAPER_BIN` | Use `/usr/bin/google-maps-scraper` (not `/usr/local/bin/...`) on the gosom-based image |
| Build fails pulling `gosom/google-maps-scraper` | Retry deploy; check Railway build logs |
| `Scraper binary not found` | `MAPS_SCRAPER_BIN=/usr/bin/google-maps-scraper` |
| Playwright / browser errors | Bump memory to **2 GB+**; redeploy |
| Search times out | Increase `MAPS_SCRAPER_TIMEOUT_MS=600000` |
| Auth redirect fails | Fix Supabase Site URL + redirect URLs |

## Local Docker test (optional)

```bash
docker build -t leadforge .
docker run --rm -p 3000:3000 --env-file .env.local leadforge
```

Use production-like `NEXT_PUBLIC_SITE_URL` in the env file you pass.
