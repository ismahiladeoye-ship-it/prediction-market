const path = require('node:path');
const fs = require('node:fs');
const express = require('express');

// Serves the built React storefront from this same Node process, so the whole
// shop (pages + API) runs as one service at one address (Railway, Render, Fly,
// a VPS). On Vercel and in the Docker setup the pages are served separately and
// this is off. The security headers match deploy/nginx/default.conf.template:
// keep the two in step.
const PAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  'frame-src https://*.firebaseapp.com https://accounts.google.com',
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

const pageSecurityHeaders = (res) => {
  res.set({
    'Content-Security-Policy': PAGE_CSP,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  });
};

const isApi = (req) => req.path === '/api' || req.path.startsWith('/api/');

// Registers static serving on the app. API routes are already mounted, so this
// only ever answers non-/api requests; an unknown /api path still falls through
// to the JSON 404 handler.
const serveStaticSite = (app, dir) => {
  const indexFile = path.join(dir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    // Misconfiguration: say so clearly rather than 404-ing every page.
    throw new Error(`SERVE_STATIC is on but no built storefront was found at ${dir} (expected index.html). Run "npm run build" and set STATIC_DIR.`);
  }

  app.use((req, res, next) => {
    if (isApi(req)) return next();
    pageSecurityHeaders(res);
    next();
  });

  app.use(
    express.static(dir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Fingerprinted assets never change; everything else must be revalidated
        // so a new deploy is picked up (index.html above all).
        const immutable = filePath.includes(`${path.sep}static${path.sep}`);
        res.set('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    })
  );

  // Client-side routes (e.g. /checkout, /admin) are served index.html.
  app.get('*', (req, res, next) => {
    if (isApi(req)) return next();
    pageSecurityHeaders(res);
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
};

module.exports = { serveStaticSite, PAGE_CSP };
