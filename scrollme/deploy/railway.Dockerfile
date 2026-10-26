# The whole shop in one container: the Node API also serves the built React
# storefront (SERVE_STATIC), so it runs as a single service on Railway, Render,
# Fly or any VPS. Build context is the scrollme/ folder; see docs/RAILWAY.md.

# --- Stage 1: build the storefront ---
FROM node:24-bookworm-slim AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts
COPY public ./public
COPY src ./src
COPY .env.production .prettierrc.cjs eslint.config.mjs jsonconfig.json ./
RUN npm run build

# --- Stage 2: the API plus the built storefront ---
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only (bcrypt ships prebuilt binaries for glibc).
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts \
  && npm rebuild bcrypt \
  && npm cache clean --force

COPY --chown=node:node backend/api ./api
COPY --chown=node:node backend/scripts ./scripts
COPY --chown=node:node backend/server.js ./
COPY --chown=node:node --from=web /web/build ./build

# Uploaded product photos. Mount a Railway volume here so they survive deploys.
RUN mkdir -p /app/uploads && chown node:node /app/uploads

ENV SERVE_STATIC=true \
    STATIC_DIR=/app/build \
    UPLOAD_DIR=/app/uploads

USER node
# Railway sets PORT; the app listens on it (default 8080 elsewhere).
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
