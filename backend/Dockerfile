FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci && DATABASE_URL=postgres://dummy npx prisma generate

FROM deps AS prisma

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated/prisma ./src/generated/prisma
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

RUN npx tsc

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ARG BUILD_VERSION
ENV BUILD_VERSION=${BUILD_VERSION}
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci --omit=dev && DATABASE_URL=postgres://dummy npx prisma generate && npm cache clean --force

COPY healthcheck.js ./
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000

CMD ["node", "dist/index.js"]
