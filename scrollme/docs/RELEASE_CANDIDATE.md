# Get It Sourced (ScrollMe) — release candidate report

Branch `claude/scrollme-ecommerce-phases-cwocsl`. Baseline: the original code imported unmodified in commit `79b736e`; audit in [audit/AUDIT.md](audit/AUDIT.md).

## Verification summary (updated 2026-10-25, Node 22.22, MongoDB 7)

| Check | Result |
| --- | --- |
| API lint (ESLint + Prettier) | ✅ clean |
| API tests (Jest + Supertest, real MongoDB) | ✅ **178 / 178** — in-memory MongoDB and an external MongoDB (as CI uses) |
| Storefront lint + Prettier check | ✅ clean (the original failed Prettier in 28 files) |
| Storefront unit tests | ✅ **28 / 28** (the original suite could not run) |
| Storefront production build | ✅ compiles; no inline scripts (CSP-safe) |
| End-to-end browser tests (Playwright, desktop + phone) | ✅ **25 / 25** (one phone-only test is skipped in the desktop browser) against the real API, a seeded database and the production build |
| Full purchase through nginx with production headers | ✅ 17 steps, 0 CSP violations, 0 console/page errors, 0 px horizontal overflow at 390 px |
| nginx config (`nginx -t`) and headers | ✅ CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy on pages; `no-store` + API CSP on `/api`; immutable caching on assets |
| Backup → restore drill | ✅ counts identical after restore into a separate database; tampered archive rejected |
| Production dependency audit, API | ✅ 0 vulnerabilities (express, mongoose, bcrypt 6, nodemailer, zod 4 upgraded) |
| Security audit (23 Oct 2026, re-audited 25 Oct) | ✅ 23 Oct: 31 code/configuration findings (0 critical/high, 3 medium, 16 low fixed; 12 informational) and 80 dependency advisories. 25 Oct (new features and Vercel): 2 medium and 1 low fixed, 5 informational; API runtime dependencies 0 advisories — see [security/SECURITY_AUDIT.md](security/SECURITY_AUDIT.md) |
| Production dependency audit, storefront | ⚠️ see *Known limitations* |
| Docker images | ✅ both images built by the `docker` CI job |
| Vercel build (`vercel build`, CLI 65.2) | ✅ storefront and API function build; the function (51 MB, Node 24, London) was then run over HTTP against MongoDB: health, readiness, catalogue, sign-up (bcrypt, Secure cookies), contact form, Stripe webhook signature check (valid and forged), cron secret, sharp — all pass. Photo shrinking checked in Chromium (21.6 MB photo → 2.2 MB) |
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

**Redesigned at the owner's request (23 Oct 2026)** in a monochrome streetwear style modelled on a reference site the owner supplied: black-and-white palette, Bebas Neue display headings with Inter body text, rotating announcement bar, a header with the bag-mark logo on the left, a *Shop* menu and icons on the right (phone: menu drawer), a rounded dark hero carousel, a *Shop by collection* coverflow slider with one card per collection (swipe, arrows or keyboard; live item counts), then a separate swipeable product row for each collection (Clothing, Footwear, Accessories, Fragrances) with shortcut links to its main categories and a progress bar, an image-and-text *Can't find it? We'll source it* section, rounded FAQ cards, and a footer with a scrolling brand banner beside the newsletter sign-up. Only the layout and style were followed; the logo, photos and copy are the store's own. The reference site's testimonials, reviews, mystery boxes and 10 %-off pop-up were deliberately not copied: they would be untrue for this store until it has real reviews and offers.

Photos are from Pexels (free commercial licence). At the owner's request (24 Oct 2026) they show only products, no people, in a streetwear mood. Each was checked at full size for brand logos and for where it was taken (one candidate pile of shoes turned out to be from the Auschwitz memorial and was rejected): 19577865, 6045058, 31961168, 581339 (hero); 2249249, 7193634, 16359299, 34036480 (collection cards; the backpack's maker's patch was blanked out, so it is served from `public/images/home/`); 9594676 (sourcing section). Photos of the shop's own stock can replace any of them in `storeConfig`. Cards, slides and the sourcing section are configured in `storeConfig` (`src/data.js`). Screenshots: [screenshots/](screenshots/).

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
- **UK store**: prices are shown in pounds and charged in GBP; standard delivery is free on orders of £100 or more and £3.99 below that (the bag shows how much more to spend for free delivery); checkout accepts UK addresses only (postcode checked by the API); 30-day returns. Express delivery appears only if `SHIPPING_EXPRESS` is set. The "3–5 working days" delivery estimate is a placeholder to confirm.
- **Currency of the sample catalogue**: its prices come from an Indian-rupee source, so they read as large pound amounts. Re-price or replace with the store's own stock before real sales.
- **Duplicate products**: the scraped catalogue contains some duplicated items (same name and image). Hide duplicates in Admin → Products if needed.
- **Storefront build tooling**: Create React App (`react-scripts`) is unmaintained, and `npm audit` flags 38 of its development-server/build-time dependencies (down from 65 after overrides). None are shipped to browsers. A move to Vite would clear these; see [security/SECURITY_AUDIT.md](security/SECURITY_AUDIT.md).
- **Email**: with `SMTP_URL` set, customers get an order confirmation (with the cancellation information UK law requires), a *shipped* email with the tracking number and a *refunded* email; the owner gets a new-order alert and every contact-form message (replying answers the customer). Each order email is sent once. Without `SMTP_URL`, nothing is sent (the dashboard says so). Preview: [screenshots/email-confirmation.png](screenshots/email-confirmation.png).
- **Collections and newsletter**: products are grouped into four collections (`backend/api/config/collections.js`); footer sign-ups are stored and admins can export them from `GET /api/newsletter`.
- **Shop details** (*Admin → Shop details*): business name and legal name, address, contact email, phone, company and VAT numbers, delivery time, who pays return postage and social links. They appear in the footer, on the legal pages, the contact page, the FAQ and in emails. *Admin → Dashboard* lists what is still missing before taking real orders.
- **Legal pages**: Terms & conditions, Privacy policy, Returns & refunds (14-day cancellation, 30-day returns, faulty goods, cancellation form) and Delivery (prices read from the API settings), linked from the footer, checkout and sign-up. They are written for a UK consumer shop from what the code actually does (cookies, storage, services used), but are a starting point: **have them checked** before launch, and update `LAST_UPDATED` in `src/pages/legal/LegalLayout.jsx` when you change them.
- **Placeholder content to replace**: `storeConfig` in `src/data.js` holds the location ("United Kingdom") and the *We'll source it* section (remove it with `feature: null` if the store does not take sourcing requests); the About page copy is a starting point.
- **Home product rows** show each collection's best-rated items in stock (by rating, not sales, so they are not labelled "best sellers"); repeated catalogue listings are shown once. Shortcuts and collections are set in `storeConfig.homeCollections`.
- **Home page cover images** (*Admin → Home page*): the owner uploads their own photos for the slides at the top of the home page and sets each heading, text, button and the page it opens (only pages on the shop), reorders or removes slides (up to 6), and turns black and white on or off. Until something is saved the starter photos from `storeConfig` are shown; *Use the starter cover images* goes back to them. Uploaded covers are stored like product photos (WebP, no EXIF/GPS).
- **Order book** (*Admin → Order book*): pick a month to see each product sold that month with its sizes, quantity, sales and the stock left now, plus orders, sales and average order for the month, stock on hand, and a month-by-month table. Months follow UK time and count orders by the date they were paid; orders later cancelled or refunded are listed separately, not as sales. *Download CSV* gives the month as a spreadsheet. Stock is per product, so the stock column is not split by size.
- **Admin two-factor sign-in** (added at the owner's request): admins need an authenticator-app code after their password; new admins set it up on their first visit to `/admin` and save ten recovery codes. Production needs `MFA_SECRET_KEY` ([DEPLOYMENT.md](DEPLOYMENT.md#2-environment-variables)); lost phones are handled as in [OPERATIONS.md](OPERATIONS.md#admin-two-factor-sign-in). Customer accounts are unchanged, but deploying this version signs everyone out once (session tokens gained a type check).
- **Renamed to Get It Sourced** at the owner's request: wordmark, page title, footer, FAQ, emails and order numbers (`GIS-…`). Internal identifiers (folder, database name, CI) keep `scrollme`.
- **Contributors page removed** at the owner's request (page, GitHub data hook, footer link, CSP allowance for api.github.com). `/contributors` now shows the empty category page.
- **Contact page**: questions and *Find me an item* sourcing requests are saved to *Admin → Messages* and emailed to the shop (5 per hour per address, plus a hidden bot trap; no automatic reply is sent, so the form cannot be used to send email to strangers). Newsletter sign-ups are stored and exported from `GET /api/newsletter`; marketing emails are sent outside the shop.
- **Main bundle** is ~640 kB gzipped (original: 649 kB). Firebase now loads only when Google sign-in is used; further splitting of Chakra/MUI is possible.

## Promotion to `main`

Merged to `main` for the Vercel launch. Before taking real payments, complete the Stripe test-mode purchase and the go-live steps in [VERCEL.md](VERCEL.md) (§7 and §10).
