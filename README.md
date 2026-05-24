# LeadForge (MVP)

LeadForge is a lightweight SaaS workspace for web design agency owners to:

- find local businesses that need a real website and save them to campaigns
- run manual cold-calling sessions (using `tel:` links)
- generate AI cold-call scripts and website preview specs
- track simple sales metrics in a dashboard

## Stack

- Next.js App Router + TypeScript + Tailwind
- shadcn-style UI components
- Supabase Auth + Postgres (with RLS)
- Lead discovery worker (configure via env — see Lead discovery setup)
- OpenAI

## Auth setup (Supabase)

1. In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers**, enable **Google** (and/or Email).
2. Under **URL configuration**, set **Site URL** to `http://localhost:3000` (or your production URL).
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**` (optional wildcard for local dev)
4. In `.env.local`, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and **do not** set `DISABLE_AUTH=true` unless you want passwordless dev mode.
5. Run these in **SQL Editor** (in order): `008_auth_profiles.sql`, `009_profile_full_name.sql`, `011_fix_signup_profile_trigger.sql`.

If email signup shows **"Database error saving new user"**, run `011_fix_signup_profile_trigger.sql` — it adds the `full_name` column, fixes the signup trigger, and allows the auth service to insert profiles.

Sign in at `/login` with Google or email. Sign out from the dashboard sidebar menu.

## Lead discovery setup

1. Install [google-maps-scraper](https://github.com/gosom/google-maps-scraper) and note the binary path:

```bash
go install github.com/gosom/google-maps-scraper@latest
# Binary is usually: $(go env GOPATH)/bin/google-maps-scraper
```

2. Install **Playwright browsers for the Go scraper** (not `npx playwright` — the CLI uses playwright-go):

```bash
go run github.com/playwright-community/playwright-go/cmd/playwright@latest install --with-deps
```

On the first scrape, the binary may also download drivers into `~/Library/Caches/ms-playwright-go/`. Run the scraper once from Terminal so downloads can finish before using the app.

3. Copy env and configure:

```bash
cp .env.example .env.local
```

```env
MAPS_SCRAPER_ENABLED=true
MAPS_SCRAPER_MODE=cli
MAPS_SCRAPER_BIN=/path/to/google-maps-scraper
MAPS_SCRAPER_RESULTS_DIR=./tmp/maps-scraper-results
```

4. Run SQL migrations in Supabase (001–007).

5. Start dev server:

```bash
npm install
npm run dev
```

Discovery runs **only** through google-maps-scraper. For each listing, the app reads the Maps `website` field only:

- Empty, social (Facebook, Instagram, etc.), or directory (Yelp, Angi, etc.) → saved as a lead (`has_real_website: false`, badge **No website found**)
- Real owned domain (e.g. `exampleplumbing.com`) → skipped (not shown in campaign results)

No homepage checks, web search, or fallback providers (Serper, Tavily, Brave, OSM, Google Places API, in-app Playwright Maps bot).

### Troubleshooting: “could not install driver”

The CLI uses **playwright-go**, not Node’s Playwright. `npx playwright install chromium` does not fix this.

1. In Terminal (same Mac user as `npm run dev`):

```bash
go run github.com/playwright-community/playwright-go/cmd/playwright@latest install --with-deps
```

2. Smoke-test the binary (downloads may finish here):

```bash
echo "electricians in Bothell, WA" > /tmp/maps-test-input.txt
$(go env GOPATH)/bin/google-maps-scraper -input /tmp/maps-test-input.txt -results /tmp/maps-test-out -json -exit-on-inactivity 3m
```

3. If downloads still fail: check VPN/firewall/DNS, or use Docker (`MAPS_SCRAPER_MODE` + `MAPS_SCRAPER_DOCKER_ENABLED=true`, image `gosom/google-maps-scraper`).

## API

- `POST /api/campaigns/[id]/find-leads` — starts a discovery job
- `GET /api/campaigns/[id]/discovery-jobs/[jobId]` — poll job progress
- `GET /api/lead-discovery/providers` — shows `google_maps_scraper` status only
