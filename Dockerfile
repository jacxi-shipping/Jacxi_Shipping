FROM node:20-alpine AS base
WORKDIR /app

ARG DATABASE_URL="postgresql://postgres:rootroot%23@database-1.cda8cem8oi5h.us-east-2.rds.amazonaws.com:5432/jacxi"
ENV DATABASE_URL=${DATABASE_URL}

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

COPY package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.* ./
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "start"]

