# Get It Sourced API

Express + Mongoose REST API for the Get It Sourced store (based on ScrollMe). Sessions use httpOnly cookies (`accessToken`, 15 minutes; `refreshToken`, 7 days, sent only to `/api/auth`). Every request body and query is validated with zod; money is computed in integer cents.

## Setup

```bash
cp .env.example .env     # every variable is documented in the file
npm install
npm run seed             # development data (refuses to run in production)
npm run dev              # nodemon; `npm start` for plain node
```

Configuration is validated at start-up (`api/config/env.js`). In production the server refuses to start with weak or shared JWT secrets, a missing or weak `MFA_SECRET_KEY`, `PAYMENT_PROVIDER=mock`, or a live Stripe key unless `STRIPE_ALLOW_LIVE=true`.

### Administrators

```bash
ADMIN_PASSWORD='a-strong-password' npm run create-admin -- --email=owner@example.com --username=owner --first=Store --last=Owner
```
Running it for an existing email grants the admin role instead.

Administrators must use **two-factor sign-in** (an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password). The first time a new admin opens the admin pages, they scan a QR code, confirm one code and save ten one-time recovery codes. After that, signing in needs the password and then a 6-digit code (or a recovery code). Every `/api/admin` request checks that two-factor is set up **and** was completed in the current session; customers are not affected.

- Authenticator secrets are stored encrypted (AES-256-GCM, key from `MFA_SECRET_KEY`); recovery codes are stored as hashes. Each code works once.
- Lost phone *and* recovery codes: `npm run reset-mfa -- --email=owner@example.com` turns two-factor off for that account and signs it out everywhere; the admin sets it up again on next visit.
- Development: the seeded `mjohnson` admin has two-factor on with a fixed demo key; `npm run dev-admin-code` prints its current code (refuses to run in production).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm start` / `npm run dev` | Run the API |
| `npm test` | Jest suite on MongoDB (in-memory, or `TEST_MONGODB_URI`) |
| `npm run lint` | ESLint + Prettier |
| `npm run seed [-- --reset] [-- --limit=500]` | Seed catalogue (+ demo users outside production) |
| `npm run create-admin` | Create or promote an administrator |
| `npm run reset-mfa -- --email=…` | Turn off an admin's two-factor sign-in (lost phone and recovery codes) |
| `npm run dev-admin-code` | Current two-factor code of the seeded demo admin (development only) |

## Endpoints

Auth column: — public, **U** signed-in user, **A** admin who completed two-factor sign-in in this session.

| Method & path | Auth | Description |
| --- | --- | --- |
| `GET /api/health` | — | Liveness |
| `GET /api/ready` | — | Readiness (database ping) |
| `GET /api/cron/release-expired` | `Authorization: Bearer $CRON_SECRET` | Vercel Cron backstop: releases stock held by expired unpaid orders → `{ released }`; 404 unless `CRON_SECRET` is set and matches |
| `POST /api/auth/register` | — | Create account, starts session. 10 sign-ups per hour per IP |
| `POST /api/auth/login` | — | `{ username, password }` (username or email) |
| `POST /api/auth/logout` | — | Ends session and revokes all refresh tokens |
| `POST /api/auth/refresh-token` | cookie | Rotates tokens |
| `GET /api/auth/me`, `GET /api/auth/status` | U | Current user |
| `POST /api/auth/forgot-password` / `reset-password` | — | Emailed, single-use, 30-minute token. Reset emails: 3 per hour per address and 10 per hour per IP (same reply whether or not the address has an account) |
| `POST /api/auth/google` | — | Firebase ID token → session (needs `FIREBASE_PROJECT_ID`) |
| `POST /api/auth/mfa/verify` | pending cookie | Second sign-in step: `{ code }` (6-digit code or recovery code). When two-factor is on, `login`/`google` answer `{ mfaRequired: true }` and set only a 5-minute `mfaPending` cookie |
| `GET /api/auth/mfa` | U | `{ enabled, required, verified, recoveryCodesLeft }` |
| `POST /api/auth/mfa/setup`, `POST /api/auth/mfa/enable` | U (admins) | Setup: new key + QR code; then `{ code }` switches it on and returns 10 recovery codes (signs out other devices) |
| `GET /api/product/list` | — | `page, limit≤100, q, category, brand, minPrice, maxPrice, inStock, sort=newest\|price_asc\|price_desc\|rating\|name` |
| `GET /api/product/categories`, `GET /api/product/brands` | — | Facets with counts |
| `GET /api/product/:id` | — | Active product |
| `GET /api/cart` | U | Cart with server prices, `summary`, `deliveryOptions`, `issues` (`?delivery=express`) |
| `POST /api/cart/add` | U | `{ productId, quantity, size }` — any `price` sent is ignored |
| `PUT /api/cart/update`, `DELETE /api/cart/delete`, `DELETE /api/cart/items/:id?size=`, `DELETE /api/cart/clear` | U | |
| `GET/POST/DELETE /api/wishlist`, `POST /api/wishlist/merge`, `DELETE /api/wishlist/:id` | U | |
| `GET /api/payments/methods` | — | Enabled methods and whether payments are in test mode |
| `POST /api/orders` | U | `{ shippingAddress, deliveryMethod, paymentMethod }` → order + `checkoutUrl` |
| `GET /api/orders`, `GET /api/orders/:id` | U | History / detail (confirms payment with Stripe on return) |
| `POST /api/orders/:id/pay` | U | New payment session, optionally `{ paymentMethod }` |
| `POST /api/orders/:id/cancel` | U | Unpaid orders only; releases stock |
| `POST /api/payments/stripe/webhook` | Stripe signature | `checkout.session.completed` etc. |
| `POST /api/payments/mock/:id/complete` | U | Only when `PAYMENT_PROVIDER=mock` |
| `GET /api/admin/stats` | A | Dashboard numbers |
| `GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/:id`, `POST /api/admin/products/:id/stock` | A | Product management (`DELETE` hides); products have an optional unique `sku` and an `images` gallery |
| `POST /api/admin/uploads` | A | One photo (`multipart/form-data`, field `image`, ≤ 15 MB): re-encoded to WebP ≤ 1600 px without EXIF/GPS → `{ url }`. Stored in `UPLOAD_DIR`, or in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (503 on Vercel without one) |
| `POST /api/admin/products/import` | A | `{ csv, dryRun, photos: { "file.jpg": url } }` — spreadsheet create/update by SKU; see [docs/BULK_UPLOAD.md](../docs/BULK_UPLOAD.md) |
| `GET /api/uploads/:file` | — | Uploaded photos (immutable caching) |
| `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status` | A | Fulfilment; only allowed status transitions |
| `GET /api/site/business` | — | Shop details (name, legal name, address, email, phone, company/VAT numbers, delivery time, return postage, socials) and the delivery terms from the API settings |
| `PUT /api/admin/business` | A | Save the shop details |
| `POST /api/contact` | — | Contact page: `{ kind: general\|sourcing, name, email, phone?, orderNumber?, item?, size?, budget?, message }`; saved and emailed to the shop. 5 per hour per IP; a filled hidden `website` field is accepted and ignored |
| `GET /api/admin/messages?status=new\|replied\|closed\|all`, `PATCH /api/admin/messages/:id` | A | Contact messages and their status |
| `GET /api/site/home` | — | Home page cover images `{ heroSlides, heroMono }`; `heroSlides` is `null` until an admin saves some (the storefront then shows its starter slides) |
| `PUT /api/admin/home`, `DELETE /api/admin/home` | A | Save the cover images (1–6 slides: `image` uploaded or https, `title`, `subtitle`, `cta`, `link` to a page on the shop starting with `/`, `focus` top/center/bottom; plus `heroMono`), or go back to the starter ones |
| `GET /api/admin/order-book?month=YYYY-MM` | A | Order book: a month's paid orders (by payment date, UK time) broken down by product and size with sales and current stock, cancelled/refunded totals, stock on hand, and the 12 months up to it. Defaults to the current month |
| `POST /api/product/add`, `PUT /api/product/update/:id`, `DELETE /api/product/delete/:id` | A | Original endpoints, now admin-only |

Order statuses: `pending_payment → paid → processing → shipped → delivered`, with `cancelled` (stock returned) and `refunded` where allowed.

Errors are JSON: `{ "message": "...", "details": [{ "field", "message" }] }`.
