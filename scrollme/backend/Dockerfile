FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only (bcrypt ships prebuilt binaries for glibc).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts \
  && npm rebuild bcrypt \
  && npm cache clean --force

COPY --chown=node:node api ./api
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node server.js ./
# Product photos live here; mount a volume so they survive new deployments.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
ENV UPLOAD_DIR=/app/uploads

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
