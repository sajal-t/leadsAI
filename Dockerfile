# LeadForge — Next.js on the official google-maps-scraper image (Chromium + Playwright match).

FROM gosom/google-maps-scraper:latest AS scraper-base

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

# Run on the same OS/libs as the scraper (debian trixie + /opt/browsers).
FROM scraper-base AS runner
WORKDIR /app

ENTRYPOINT []
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

ENV MAPS_SCRAPER_ENABLED=true
ENV MAPS_SCRAPER_MODE=cli
ENV MAPS_SCRAPER_BIN=/usr/bin/google-maps-scraper
ENV MAPS_SCRAPER_RESULTS_DIR=/tmp/maps-scraper-results
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
ENV PLAYWRIGHT_DRIVER_PATH=/opt
ENV HOME=/tmp
ENV TMPDIR=/tmp
ENV XDG_CONFIG_HOME=/tmp
ENV XDG_RUNTIME_DIR=/tmp

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /tmp/maps-scraper-results \
    && chmod 1777 /tmp/maps-scraper-results

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs \
    && chown -R nextjs:nodejs /opt \
    && chmod -R u+rwX /opt \
    && chmod a+rx /usr/bin/google-maps-scraper

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
