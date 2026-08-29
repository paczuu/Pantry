# =========================
# BUILD
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma na Alpine potrzebuje OpenSSL
RUN apk add --no-cache openssl libc6-compat

# Najpierw package.json dla lepszego cache Dockera
COPY package*.json ./

RUN npm install

# Reszta backendu
COPY . .

# Generowanie Prisma Client
RUN npx prisma generate

# Build backendu
RUN npm run build


# =========================
# PRODUCTION
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/app/data/pantry.db

# Instalujemy tylko produkcyjne zależności
COPY package*.json ./

RUN npm install --omit=dev

# Prisma schema
COPY --from=builder /app/prisma ./prisma

# Wygenerowany Prisma Client
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Zbudowany backend
COPY --from=builder /app/dist ./dist

# Katalog SQLite
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]