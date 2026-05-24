# LeadForge billing model (draft)

Internal product doc for pricing tiers, usage limits, and cost drivers. Not implemented in code yet — use this to align landing page copy, Stripe meters, and env caps.

---

## Cost drivers (what actually costs money)

Rough order of **marginal cost per user action** (highest first):

| Action | Why it’s expensive | Typical COGS (order of magnitude) |
|--------|------------------|-----------------------------------|
| **AI website generation** (full site in Studio) | Large LLM output (HTML/CSS/JS), often streamed; initial gen >> edits | **$0.15–$0.80+** per full site (model-dependent) |
| **AI website edits** (Studio chat / diff) | Still multi-thousand tokens per edit | **$0.05–$0.25** per meaningful edit |
| **Cold-call script generation** | Smaller JSON completion | **$0.01–$0.05** per script |
| **Deep search** (multi-query Maps scrape) | ~4× scraper runtime, CPU, Playwright, longer wall time | **$0.02–$0.10** per campaign run (mostly infra) |
| **Shallow / quick search** | Single Maps query (~100 listings) | **$0.01–$0.03** per run |
| **Google listing verification** (optional) | External search API | **~$0.01** per verify (already modeled as credits) |

**Takeaway:** Price and meter **website generations** first. Lead searches are cheaper at scale but add up for heavy dialers. Scripts sit in the middle but are small compared to a single full site.

---

## Recommended unit: **credits**

One simple mental model for customers and for engineering:

| Credit action | Credits (suggested) | Notes |
|---------------|---------------------|--------|
| Shallow lead search (1 campaign run) | **5** | Quick sample |
| Deep search (multi-query run) | **20** | ~4× shallow |
| Cold-call script (per business) | **2** | Regenerate counts again |
| **Full website preview (initial gen)** | **40** | Main margin lever |
| Website Studio edit (per edit request) | **10** | Cap edits on lower tiers |
| Google verify (optional) | **1** | Matches existing verify cost idea |

Monthly plan = **credit allowance** + feature flags (seats, deep search on/off, etc.).

Example: **Starter 600 credits/mo** ≈ 15 full sites *or* 120 shallow searches *or* a realistic mix (see tier table below).

---

## Tiers (customer-facing)

### Starter — **$29/mo**

**For:** Solo freelancer testing outbound.

| Included | Limit |
|----------|--------|
| Credits / month | **600** |
| Shallow searches | Unlimited within credits (5 cr each) |
| Deep search | **Not included** (or 25 cr, max 2/mo) |
| Website generations | **~10/mo** at 40 cr (within 600) |
| Script generations | **~50/mo** at 2 cr |
| Campaigns & leads saved | Fair use (e.g. 5k leads in workspace) |
| Call logging & pipeline | Yes |
| Seats | **1** |

**Positioning:** “Enough to close a few deals a month without burning margin on AI sites.”

---

### Pro — **$79/mo** (most popular)

**For:** Active freelancers / small agencies dialing weekly.

| Included | Limit |
|----------|--------|
| Credits / month | **2,500** |
| Shallow searches | Within credits |
| Deep search | **Yes** (20 cr each; ~30 deep runs/mo if used exclusively) |
| Website generations | **~40/mo** at 40 cr (or mix with searches) |
| Studio edits | **100 edits/mo** (10 cr each) included in credits |
| Script generations | Generous within credits |
| Priority support | Email |
| Seats | **1** (+$25/seat optional later) |

**Positioning:** “Unlimited-style lead discovery” in marketing = **unlimited shallow** only if you cap deep separately, *or* keep everything credit-based and say “2,500 credits” (honester).

**Recommendation:** Market as **“2,500 credits + deep search included”** rather than unlimited searches, unless you eat cost on shallow-only with a hard rate limit (e.g. 60 shallow/mo included, then credits).

---

### Agency — **$199/mo**

**For:** Small teams with multiple closers and heavy preview usage.

| Included | Limit |
|----------|--------|
| Credits / month | **8,000** (pooled) |
| Deep search | **Yes**, higher fair-use cap (e.g. 80 deep runs/mo) |
| Website generations | **~150/mo** equivalent at 40 cr |
| Studio edits | **Unlimited within credits** |
| Custom preview domains | Yes (feature flag) |
| Seats | **5 included** |
| Roles / audit log | Roadmap |
| Dedicated success | Light onboarding call |

**Positioning:** “Volume outbound + white-label previews for the team.”

---

## Feature matrix (quick reference)

| Feature | Starter | Pro | Agency |
|---------|---------|-----|--------|
| Monthly price | $29 | $79 | $199 |
| Credits / mo | 600 | 2,500 | 8,000 |
| Shallow lead search | ✓ (5 cr) | ✓ | ✓ |
| Deep search | — | ✓ (20 cr) | ✓ |
| Map-based target area | ✓ | ✓ | ✓ |
| AI cold-call scripts | ✓ | ✓ | ✓ |
| AI website previews (initial) | Limited | ✓ | ✓ |
| Studio edits | Pay credits | ✓ | ✓ |
| Pipeline & call logs | ✓ | ✓ | ✓ |
| Seats | 1 | 1 (+add-on) | 5 |
| Custom domains | — | — | ✓ |

---

## Example monthly mixes (sanity check)

**Starter (600 cr)** — pick one dominant use case:

- **Site-heavy:** 10 sites (400) + 20 scripts (40) + 32 shallow searches (160) = 600  
- **Lead-heavy:** 80 shallow searches (400) + 10 scripts (20) + 4 sites (160) = 580  

**Pro (2,500 cr)** — balanced agency freelancer:

- 20 deep (400) + 40 shallow (200) + 25 sites (1,000) + 50 scripts (100) + 80 edits (800) ≈ 2,500  

**Agency (8,000 cr)** — team:

- 50 deep (1,000) + 100 shallow (500) + 80 sites (3,200) + 200 scripts (400) + 290 edits (2,900) ≈ 8,000  

Adjust credit weights if real COGS data says website gen is higher than ~40× a shallow search.

---

## Overage & add-ons

| Add-on | Suggested price |
|--------|-----------------|
| Credit pack **500** | $25 |
| Credit pack **2,000** | $79 (volume discount) |
| Extra seat (Pro) | $25/mo |
| Extra seat (Agency) | $15/mo (above 5) |
| Deep-search-only boost (+10 deep runs) | $15/mo |

**Hard stops (recommended):** Block website gen when credits = 0; allow read-only pipeline. Optionally allow shallow search at reduced priority on Starter when at 0 (or hard block everything).

---

## Implementation notes (when you build billing)

1. **Meter events** (Supabase or Stripe Billing):  
   `lead_search.shallow`, `lead_search.deep`, `script.generate`, `site.generate`, `site.edit`, `google.verify`

2. **Store on workspace:** `plan`, `credits_balance`, `credits_reset_at`, `usage_period_start`

3. **Check before:**  
   - `POST /api/campaigns/[id]/find-leads` → shallow vs deep credit cost  
   - `POST .../generate-site` → highest check (40 cr)  
   - `POST .../generate-script` → 2 cr  
   - `POST /api/ai-studio/projects/[id]/edit` → 10 cr  

4. **Campaign flag:** Persist `deep_search` on campaign (already in DB); bill at job start, not at create.

5. **Do not** call website generation “unlimited” on any tier unless you have a hard monthly cap in code.

6. **Landing page (`pricing.tsx`)** should match this doc or link to a public pricing FAQ.

---

## Gross margin targets (internal)

| Tier | Price | Target COGS | Target gross margin |
|------|-------|-------------|---------------------|
| Starter | $29 | &lt; $8 | ~70%+ |
| Pro | $79 | &lt; $22 | ~72%+ |
| Agency | $199 | &lt; $55 | ~72%+ |

Website-heavy users on Pro without caps are the main margin risk — credits + 40 cr per site mitigates that.

---

## Open decisions

1. **Unlimited shallow on Pro** — only if rate-limited (e.g. 100/mo); otherwise stick to credits.  
2. **Annual discount** — 2 months free (≈17% off).  
3. **Free trial** — 14 days, 200 credits, no deep search, max 2 site gens.  
4. **Enterprise** — custom credits, SSO, SLA, self-hosted scraper option.

---

## Summary

- **Most costly:** AI website generation (Studio initial + edits).  
- **Price with credits** so sites, deep search, and shallow search share one pool.  
- **Starter:** shallow-only positioning, few sites.  
- **Pro:** deep search + enough credits for regular previews.  
- **Agency:** pooled credits + seats + domains for teams.

Update this doc when model pricing (HF/OpenAI) or scraper infra costs change.
