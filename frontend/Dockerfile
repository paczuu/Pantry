# =========================
# BUILD
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# =========================
# NGINX
# =========================
FROM nginx:alpine

# Nasza konfiguracja nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopiujemy zbudowany frontend
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]