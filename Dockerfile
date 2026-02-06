FROM node:20-alpine AS base
WORKDIR /app

# Database connection URLs - can be overridden at build time with --build-arg
ARG jacxi_DATABASE_URL="postgres://d2325906587d7bd309f71583c05fd591f34810275eb4d811dbd48e6bfe1f94ff:sk_KA40cpqs9GjzvE-JQOFeN@db.prisma.io:5432/postgres?sslmode=require"
ARG jacxi_POSTGRES_URL="postgres://d2325906587d7bd309f71583c05fd591f34810275eb4d811dbd48e6bfe1f94ff:sk_KA40cpqs9GjzvE-JQOFeN@db.prisma.io:5432/postgres?sslmode=require"
ARG jacxi_PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19LQTQwY3BxczlHanp2RS1KUU9GZU4iLCJhcGlfa2V5IjoiMDFLQzlSNDZHWkM1QkIzQzQ3NTlGMEZHMlYiLCJ0ZW5hbnRfaWQiOiJkMjMyNTkwNjU4N2Q3YmQzMDlmNzE1ODNjMDVmZDU5MWYzNDgxMDI3NWViNGQ4MTFkYmQ0OGU2YmZlMWY5NGZmIiwiaW50ZXJuYWxfc2VjcmV0IjoiYmU5OTg2NjQtMzMyZS00YzUyLTk5MTUtZjM3ZmYwZTk1NWQ4In0.nbvHbMEP7UvGvXdwaznm9H0dRZdvtqGKVCxRCLyS_Yk"

ENV jacxi_DATABASE_URL=${jacxi_DATABASE_URL}
ENV jacxi_POSTGRES_URL=${jacxi_POSTGRES_URL}
ENV jacxi_PRISMA_DATABASE_URL=${jacxi_PRISMA_DATABASE_URL}

# Install dependencies with Prisma schema available
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Build the application
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Database URLs should be provided at runtime via:
# - Docker: docker run -e jacxi_DATABASE_URL=... -e jacxi_POSTGRES_URL=...
# - Docker Compose: environment section in docker-compose.yml
# - Kubernetes: ConfigMap or Secret
# Required variables:
#   - jacxi_DATABASE_URL
#   - jacxi_POSTGRES_URL
#   - jacxi_PRISMA_DATABASE_URL (optional, for Prisma Accelerate)

COPY package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.* ./
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/prisma ./prisma

EXPOSE 3000

# Run migrations on container start, then start the app
# Requires: jacxi_DATABASE_URL and jacxi_POSTGRES_URL environment variables
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]


