# LocalLead AI (MVP)

LocalLead AI is a lightweight SaaS workspace for web design agency owners to:

- find local businesses with **No website found** from Google Places
- run manual cold-calling sessions (using `tel:` links)
- generate AI cold-call scripts, follow-up emails, and website preview specs
- send reviewed follow-up emails via Resend
- track simple sales metrics in a dashboard

## Stack

- Next.js App Router + TypeScript + Tailwind
- shadcn-style UI components
- Supabase Auth + Postgres (with RLS)
- Next.js API routes
- Google Places API + OpenAI + Resend

## Setup

1. Install deps:

```bash
npm install
```

2. Copy env:

```bash
cp .env.example .env.local
```

3. Fill all environment variables in `.env.local`.
4. Run the SQL migration from `supabase/migrations/001_locallead_ai.sql` in Supabase SQL editor.
5. Start dev server:

```bash
npm run dev
```

## Routes

- ` /login`
- ` /dashboard`
- ` /campaigns/new`
- ` /campaigns/[id]`
- ` /businesses/[id]`
- ` /preview/[slug]`

## API Routes

- `POST /api/campaigns`
- `POST /api/campaigns/[id]/find-leads`
- `GET /api/campaigns/[id]/businesses`
- `GET /api/businesses/[id]`
- `POST /api/businesses/[id]/generate-script`
- `POST /api/call-logs`
- `POST /api/businesses/[id]/generate-email`
- `POST /api/emails/[id]/send`
- `POST /api/businesses/[id]/generate-site`
- `GET /api/dashboard`
