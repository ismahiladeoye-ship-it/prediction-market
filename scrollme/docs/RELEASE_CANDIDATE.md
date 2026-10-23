# Get It Sourced (ScrollMe) — release candidate report

Branch `claude/scrollme-ecommerce-phases-cwocsl`. Baseline: the original code imported unmodified in commit `79b736e`; audit in [audit/AUDIT.md](audit/AUDIT.md).

## Verification summary (2026-10-23, Node 22.22, MongoDB 7)

| Check | Result |
| --- | --- |
| API lint (ESLint + Prettier) | ✅ clean |
| API tests (Jest + Supertest, real MongoDB) | ✅ **91 / 91** — in-memory MongoDB and an external MongoDB (as CI uses) |
| Storefront lint + Prettier check | ✅ clean (the original failed Prettier in 28 files) |
| Storefront unit tests | ✅ **24 / 24** (the original suite could not run) |
| Storefront production build | ✅ compiles; no inline scripts (CSP-safe) |
| End-to-end browser tests (Playwright, desktop + phone) | ✅ **19 / 19** (one phone-only test is skipped in the desktop browser) against the real API, a seeded database and the production build |
| Full purchase through nginx with production headers | ✅ 17 steps, 0 CSP violations, 0 console/page errors, 0 px horizontal overflow at 390 px |
| nginx config (`nginx -t`) and headers | ✅ CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy on pages; `no-store` + API CSP on `/api`; immutable caching on assets |
| Backup → restore drill | ✅ counts identical after restore into a separate database; tampered archive rejected |
| Production dependency audit, API | ✅ 0 vulnerabilities (express, mongoose, bcrypt 6, nodemailer upgraded) |
| Production dependency audit, storefront | ⚠️ see *Known limitations* |
| Docker images | ✅ both images built by the `docker` CI job ([run #1](https://github.com/ismahiladeoye-ship-it/prediction-market/actions/runs/39897792729)) |
| CI on GitHub | ✅ run #1: API, storefront, end-to-end and Docker jobs all green |

## How each audit finding was resolved

| # | Finding (see AUDIT §4) | Resolution | Evidence |
| --- | --- | --- | --- |
| 1 | Cart trusted client price | Cart stores only product, size, quantity; prices read from the product on every request; totals in integer cents | `cart.test.js` "ignores a client-supplied price" |
| 2 | Product writes open to any user; mass assignment | `requireAdmin` on all writes (original paths kept); strict zod schemas | `admin.test.js` permission matrix |
| 3 | Committed/default secrets | Config validated at start; production rejects weak/shared secrets | `config.test.js` |
| 4 | Refresh flow broken, no revocation | Separate refresh secret, rotation, cookie path `/api/auth`, `tokenVersion` revokes on logout and password reset | `auth.test.js` "logout revokes…", "refreshes tokens…" |
| 5 | Legacy `/api/user` broken (double hashing) | Removed; one auth implementation | — |
| 6 | No orders/checkout/payment/inventory | Orders with atomic stock reservation, expiry release, Stripe Checkout (test mode) with signed webhooks, admin lifecycle | `checkout.test.js` (incl. concurrent last-unit), `admin.test.js`, e2e |
| 7 | Seed stored brand as category, random sizes | Seeder rebuilt from the scraped source: 278 real categories, real sizes | `npm run seed` → `/api/product/categories` |
| 8 | No search/filter/sort; unbounded limit; inactive listed | Search, filters, sorting, `limit ≤ 100`, inactive hidden | `catalogue.test.js`, e2e catalogue |
| 9 | Bad ids → 500; error details leaked | 400/404 for ids; central error handler without internals | `catalogue.test.js`, `http.test.js` |
| 10 | Weak password rule, no rate limiting, fixed CORS | Shared password policy (8+, mixed, 72-byte cap); rate limits; CORS from config; JSON-only writes (CSRF defence) | `auth.test.js`, `http.test.js` |
| 11 | DB failure killed process / no health | Fail-fast config, `/api/health`, `/api/ready`, graceful shutdown | `http.test.js` |
| 13 | Cart never loaded from server | Redux cart mirrors the server cart | e2e "cart totals come from the server" |
| 14 | Tax/delivery shown but not in total; dead checkout buttons | Server totals; checkout flow | e2e full purchase |
| 15 | Logout did not reach the server | Fixed request; server revokes sessions | e2e "registers… logs out" |
| 16 | Google sign-in faked auth; Firebase reset for Mongo users | Google ID token verified by the API (opt-in by config); reset via API email link | `auth.test.js` |
| 17 | Search, category pages, tile links dead | Wired | e2e catalogue |
| 18–20 | Tile wishlist bug, hard-coded colour/sizes, crashes on missing data | Fixed; real colour/sizes; image fallbacks; empty/error/retry states | unit + e2e |
| 21 | Wishlist per browser, leaked between users | Stored per account; cleared on logout; guest list merged on sign-in | `wishlist.test.js`, e2e merge |
| 22 | Hard-coded API URL / Firebase config | Env-driven; same-origin `/api` | — |
| 24 | Tailwind loaded twice incl. dev-only Play CDN | Play CDN removed (the 2.2.19 stylesheet still supplies the site-wide base styles) | pixel comparison below |
| 26–28 | Phone overflow, mobile CSS bug | Fixed | 0 px overflow at 390 px on every page in the flow |

## Visual design

**Redesigned at the owner's request (23 Oct 2026)** in a monochrome streetwear style modelled on a reference site the owner supplied: black-and-white palette, Bebas Neue display headings with Inter body text, rotating announcement bar, centred bag-mark logo, phone menu drawer, rounded dark hero carousel, shop-by-collection cards, rounded FAQ cards, and a footer with a scrolling brand banner, newsletter sign-up and social links. Only the style was followed; the logo, photos and copy are the store's own. Hero/collection photos are from Pexels (free commercial licence) and were chosen without visible brand logos: 7519524, 5886041, 5480696, 2983464, 7193634. Screenshots: [screenshots/](screenshots/).

The Phase 2 comparison below describes the restored original design that preceded the redesign.

### Phase 2 check of the restored original

Pixel comparison of original vs. new builds (desktop 1366 px, phone 390 px):

| Page | Result |
| --- | --- |
| Coming soon, forgot password (desktop + phone), contact (desktop) | identical |
| Contact (phone) | 0.09 % — navbar search box now has its intended width (malformed CSS fixed) |
| Login / register | differ only where intended: "username or email" placeholder, password guidance, Google button hidden until Firebase is configured |
| Home, catalogue, product, cart | same layout, fonts and colours; real data instead of placeholders; see [screenshots/](screenshots/) |

New screens (checkout, payment sheet, orders, account, admin) reuse the original typography, teal accent, light weights and summary-box style. The payment sheet follows the reference layout supplied (radio list, card brand row, "View more", rounded Confirm) in the original teal.

## Known limitations and decisions

- **Payment methods** offered: Apple Pay, card, PayPal, Klarna, Google Pay — all through Stripe Checkout. Skrill (shown in the reference image) is not supported by Stripe and is not offered. Apple Pay is greyed out on devices that cannot use it. PayPal/Klarna must be enabled on the Stripe account; disable them with `PAYMENT_METHODS` otherwise.
- **Stripe sandbox not exercised end-to-end here**: no Stripe keys in this environment. The Stripe integration is covered by tests that verify the session parameters, real webhook signature verification (Stripe's own signing helper), amount mismatch flagging and return-page confirmation. Do the test-mode purchase in [DEPLOYMENT.md §3](DEPLOYMENT.md#3-payments-stripe-test-mode) before going live.
- **Currency**: the catalogue's prices come from an Indian-rupee source but display/charge in `$`/`usd` by default, as the original UI did. Configure currency and re-price before real sales.
- **Duplicate products**: the scraped catalogue contains some duplicated items (same name and image). Hide duplicates in Admin → Products if needed.
- **Storefront build tooling**: Create React App (`react-scripts`) is unmaintained, and `npm audit` flags its build-time dependencies. They are not shipped to browsers. The remaining runtime-tree finding is `@grpc/grpc-js` under Firebase's Firestore, which the app does not import and which is Node-only. A move to Vite would clear these; it was left out as it is a tooling change beyond this scope.
- **Email**: password-reset emails need `SMTP_URL`; order-confirmation emails are not implemented.
- **Collections and newsletter**: products are grouped into four collections (`backend/api/config/collections.js`); footer sign-ups are stored and admins can export them from `GET /api/newsletter`.
- **Placeholder content to replace**: `storeConfig` in `src/data.js` holds the location ("United Kingdom"), empty social links (icons are hidden until set) and contact email; the About page copy is a starting point.
- **Renamed to Get It Sourced** at the owner's request: wordmark, page title, footer, FAQ, emails and order numbers (`GIS-…`). Internal identifiers (folder, database name, CI) keep `scrollme`.
- **Contributors page removed** at the owner's request (page, GitHub data hook, footer link, CSP allowance for api.github.com). `/contributors` now shows the empty category page.
- **Newsletter / contact forms** still only show a confirmation (as in the original); no backend exists for them.
- **Main bundle** is ~640 kB gzipped (original: 649 kB). Firebase now loads only when Google sign-in is used; further splitting of Chakra/MUI is possible.

## Promotion to `main`

Do not merge until the `ScrollMe CI` workflow is green on the latest commit and the Stripe test-mode checklist in DEPLOYMENT.md has been completed on a staging deployment.
