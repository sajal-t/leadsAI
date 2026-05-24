# LeadForge — Next.js + google-maps-scraper (Playwright) for Railway/production.
# Reuses the official scraper image for the binary + Chromium bundle.

FROM gosom/google-maps-scraper:latest AS scraper

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Scraper defaults (override in Railway Variables if needed)
ENV MAPS_SCRAPER_ENABLED=true
ENV MAPS_SCRAPER_MODE=cli
ENV MAPS_SCRAPER_BIN=/usr/local/bin/google-maps-scraper
ENV MAPS_SCRAPER_RESULTS_DIR=/tmp/maps-scraper-results
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
ENV PLAYWRIGHT_DRIVER_PATH=/opt

# Chromium runtime libraries for playwright-go (used by google-maps-scraper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /tmp/maps-scraper-results \
    && chmod 1777 /tmp/maps-scraper-results

COPY --from=scraper /usr/bin/google-maps-scraper /usr/local/bin/google-maps-scraper
COPY --from=scraper /opt/browsers /opt/browsers
COPY --from=scraper /opt/ms-playwright-go /opt/ms-playwright-go
RUN chmod -R 755 /opt/browsers /opt/ms-playwright-go \
    && chmod +x /usr/local/bin/google-maps-scraper

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
