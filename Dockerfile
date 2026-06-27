FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
RUN npm ci --no-audit --no-fund --prefer-offline

FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_POSTHOG_KEY=""
ARG NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
ENV NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS migrator
WORKDIR /app
RUN apk add --no-cache postgresql-client
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY apps/backend_api/migrations/seed ./apps/backend_api/migrations/seed
COPY apps/backend_api/migrations/users ./apps/backend_api/migrations/users
COPY apps/backend_api/migrations/payments ./apps/backend_api/migrations/payments
COPY apps/backend_api/migrations/courses ./apps/backend_api/migrations/courses
COPY apps/backend_api/migrations/booking ./apps/backend_api/migrations/booking
COPY apps/backend_api/migrations/academy ./apps/backend_api/migrations/academy
COPY apps/backend_api/migrations/authorisation ./apps/backend_api/migrations/authorisation
COPY apps/backend_api/migrations/notification ./apps/backend_api/migrations/notification
COPY apps/backend_api/migrations/analytics ./apps/backend_api/migrations/analytics
COPY apps/backend_api/migrations/subscriptions ./apps/backend_api/migrations/subscriptions
COPY scripts/cicd/run-service-sql-migrations.sh ./scripts/cicd/run-service-sql-migrations.sh
COPY prisma.config.ts ./
RUN npx prisma generate
CMD ["sh", "-c", "npx prisma migrate deploy && sh scripts/cicd/run-service-sql-migrations.sh"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG NEXT_PUBLIC_POSTHOG_KEY=""
ARG NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
ENV NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST}
RUN apk add --no-cache curl postgresql-client \
  && addgroup -S nodejs \
  && adduser -S nextjs -G nodejs
COPY --from=builder /app/apps/portal/public ./apps/portal/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs apps/backend_api/migrations/seed ./apps/backend_api/migrations/seed
COPY --chown=nextjs:nodejs apps/backend_api/migrations/users ./apps/backend_api/migrations/users
COPY --chown=nextjs:nodejs apps/backend_api/migrations/payments ./apps/backend_api/migrations/payments
COPY --chown=nextjs:nodejs apps/backend_api/migrations/courses ./apps/backend_api/migrations/courses
COPY --chown=nextjs:nodejs apps/backend_api/migrations/booking ./apps/backend_api/migrations/booking
COPY --chown=nextjs:nodejs apps/backend_api/migrations/academy ./apps/backend_api/migrations/academy
COPY --chown=nextjs:nodejs apps/backend_api/migrations/authorisation ./apps/backend_api/migrations/authorisation
COPY --chown=nextjs:nodejs apps/backend_api/migrations/notification ./apps/backend_api/migrations/notification
COPY --chown=nextjs:nodejs apps/backend_api/migrations/analytics ./apps/backend_api/migrations/analytics
COPY --chown=nextjs:nodejs apps/backend_api/migrations/subscriptions ./apps/backend_api/migrations/subscriptions
COPY --chown=nextjs:nodejs scripts/cicd/run-service-sql-migrations.sh ./scripts/cicd/run-service-sql-migrations.sh
COPY --chown=nextjs:nodejs apps/portal/src/lib/email/templates ./apps/portal/src/lib/email/templates
COPY --chown=nextjs:nodejs apps/portal/src/lib/prisma-pg-pool.ts ./apps/portal/src/lib/prisma-pg-pool.ts
COPY --chown=nextjs:nodejs prisma.config.ts ./
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS "http://${HOSTNAME}:3000/api/health" || exit 1
CMD ["node", "apps/portal/server.js"]
