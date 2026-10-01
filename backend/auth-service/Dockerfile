FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:22-alpine AS production

RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm rebuild bcrypt --build-from-source

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3001}/api/health || exit 1

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && if [ \"$RUN_SEED\" = \"true\" ]; then node dist/seed.js; fi && node dist/main.js"]
