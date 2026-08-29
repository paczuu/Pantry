# --- ETAP 1: Budowanie Frontendu PWA ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- ETAP 2: Budowanie Backendu ---
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend

# Instalacja OpenSSL i libc dla silnika Prisma w Alpine
RUN apk add --no-cache openssl libc6-compat

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# --- ETAP 3: Obraz Produkcyjny / Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

# Instalacja bibliotek runtime OpenSSL dla Prisma SQLite
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:/app/data/pantry.db"
ENV JWT_SECRET="smart-pantry-production-jwt-secret-replace-with-your-own"

# Kopiuj zależności produkcyjne
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Kopiuj wygenerowane pliki i schemat Prisma
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY --from=backend-builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Kopiuj zbudowany frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Katalog na trwałą bazę danych SQLite
RUN mkdir -p /app/data

EXPOSE 3001

WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
