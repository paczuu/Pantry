# =========================
# BUILD
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma on Alpine requires OpenSSL
RUN apk add --no-cache openssl libc6-compat

# package.json first for better Docker layer caching
COPY package*.json ./

RUN npm install

# Remaining backend code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build backend
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

# Install production dependencies only
COPY package*.json ./

RUN npm install --omit=dev

# Prisma schema
COPY --from=builder /app/prisma ./prisma

# Generated Prisma Client
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Built backend
COPY --from=builder /app/dist ./dist

# SQLite directory
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]