# --- Build the React storefront ---
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts
COPY public ./public
COPY src ./src
COPY .env.production .prettierrc.cjs eslint.config.mjs jsonconfig.json ./
# Optional build-time settings (see .env.example)
ARG REACT_APP_API_URL=/api
ARG REACT_APP_CURRENCY_SYMBOL=$
ARG REACT_APP_FIREBASE_API_KEY=
ARG REACT_APP_FIREBASE_AUTH_DOMAIN=
ARG REACT_APP_FIREBASE_PROJECT_ID=
ARG REACT_APP_FIREBASE_APP_ID=
RUN npm run build

# --- Serve with nginx (unprivileged, port 8080) ---
FROM nginxinc/nginx-unprivileged:1.27-alpine
ENV API_UPSTREAM=api:8080
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
