# Get It Sourced — security audit

**Date:** 23 Oct 2026 · **Branch:** `claude/scrollme-ecommerce-phases-cwocsl` · **Scope:** the whole `scrollme/` codebase — API (`backend/`), storefront (`src/`), end-to-end tests, Docker/nginx/CI configuration, backup scripts and the git history.

## Result in brief

| | Found | Fixed | Left (with reason) |
| --- | --- | --- | --- |
| Critical / High in code or configuration | 0 | — | — |
| Medium in code or configuration | 3 | 3 | 0 |
| Low in code or configuration | 16 | 16 | 0 |
| Informational / accepted trade-offs | 12 | — | 12 (documented below) |
| Dependency advisories (npm, per package) | 80 | 40 | 40 — all in development/build tools, none in the API's runtime or the code sent to browsers |

That is **111 findings in total**: 31 in the code and configuration, plus 80 dependency advisories. The audit looked for every real issue rather than a target number, and nothing was counted twice to raise the total. No finding allowed an unauthenticated attacker to read other customers' data, change prices, pay less than the order total, or run code on the server.

## Method

- **Manual review of every API source file**, covering authentication, sessions, password reset, Google sign-in, authorisation and access to other users' records (IDOR), input validation, injection (MongoDB operators, regex, ReDoS), payments and webhooks, stock reservation races, rate limiting, CORS/CSRF, error handling and logging.
- **Storefront review:** XSS sinks, token storage, redirects, external links and the password-reset flow.
- **Deployment review:** nginx headers and CSP, Dockerfiles, docker-compose, the GitHub Actions workflow, and the backup and restore scripts.
- **`npm audit`** on the API, storefront and e2e packages, separating runtime packages from build-time ones. I also searched the built browser bundle for flagged packages.
- **Secret scan** of tracked files and the full git history (Stripe, webhook, Google, MongoDB, JWT and private-key patterns).
- **Testing:** every fix has a regression test, and the full suites were run again: 103 API tests, 24 storefront unit tests and 19 browser tests. The password-reset change was also walked through in a real browser.

## Findings fixed

### Medium

| ID | Finding | Fix | Test |
| --- | --- | --- | --- |
| M1 | **Account takeover through Google sign-in.** Google sign-in signed into any existing account with the same email, but sign-up does not verify email ownership. An attacker could register a victim's address with a password and keep access after the victim later used Google, or the reverse. (Google sign-in is only active when `FIREBASE_PROJECT_ID` is set.) | Google sign-in now only creates or uses Google accounts. If a password account already has that email, it answers 409 and asks the user to sign in with their password or reset it. | `auth.test.js` "never signs into a password account" |
| M2 | **End-of-life runtime.** The API and storefront Docker images and CI used Node.js 20, which stopped receiving security fixes in April 2026. | Moved to Node.js 24 LTS (`node:24-bookworm-slim`, CI `node-version: 24`); `engines` now `>=22`. All suites pass on Node 24. | full suites on Node 24 |
| M3 | **zod GHSA-mrhx-c7xc-m3w5** (high): validating oversized constrained collections could exhaust memory. This affected every zod 3 release. | Upgraded to zod 4.6.7, keeping the "Required" messages (commit `5fe3f6f3`). | API suite; `npm audit` 0 |

### Low

| ID | Finding | Fix |
| --- | --- | --- |
| L1 | Forgot-password waited for the mail server only when the email was registered, so the response time revealed which emails have accounts. | Mail is sent in the background. |
| L2 | Login was rate limited per IP only, so guessing spread over many IPs was not throttled. | Added a per-account limit: 10 failed attempts per 15 minutes. |
| L3 | The CSRF guard only covered requests with a body. With `COOKIE_SAMESITE=none`, a cross-site form with no fields could log users out or cancel unpaid orders. | Every POST/PUT/PATCH/DELETE carrying a foreign or `null` `Origin` is refused with 403. Allowed: `CLIENT_ORIGINS` plus the `APP_URL` origin. |
| L4 | JWTs were verified without fixing the algorithm (it relied on library defaults). | Signing and verification are pinned to HS256. Tests cover HS512, wrong-secret and `alg: none` tokens. |
| L5 | One account could keep any number of unpaid orders, each holding stock for 35 minutes, and so make products look sold out. | At most 3 unpaid orders per account. |
| L6 | A cart could hold unlimited different products, making every cart request slower. | At most 50 different items in a bag. |
| L7 | An admin could open a payment session on a customer's order. | Only the order's customer can resume payment. Admins can still view the order. |
| L8 | A second, different payment for an already-paid order (for example from two checkout tabs) was silently ignored, leaving the customer charged twice. | It is now flagged for refund on the order and logged. |
| L9 | Customers received the internal `attention` note (for example "refund required"). | Customers get `needsAttention: true/false`; only admin endpoints return the note. |
| L10 | Product image URLs accepted `javascript:` and `data:` addresses (admin input). | Only `http(s)://` URLs are accepted. |
| L11 | The password-reset token was in the query string, so it ended up in web-server logs and browser history. | Links now use `#token=…`, which browsers never send to the server. The page removes it from the address bar and history (old `?token=` links still work). |
| L12 | Page numbers up to 100,000 made the database skip millions of records per request. | Pages are capped at 1,000 (catalogue, admin and order lists). |
| L13 | `scripts/backup.sh` wrote archives (customer data, password hashes) with default, often world-readable, permissions. | `umask 077` makes them owner-only. |
| L14 | External links on the Coming Soon page had a misspelt `rel` attribute (`noopener_noreferrer`), so the protection against reverse tab-nabbing did not apply. | Corrected. |
| L15 | The storefront image used nginx 1.27, a branch that no longer receives updates. | `nginx-unprivileged:1.28-alpine` (current stable). |
| L16 | An unused original script (`generateProducts.js`) kept `@faker-js/faker` with a high advisory. | Script and dependency removed. |

## Informational and accepted (not changed)

| ID | Observation | Why it stays / what to do |
| --- | --- | --- |
| I1 | Registration says when an email or username is already taken. | Normal shop behaviour; failed attempts are rate limited. |
| I2 | Sign-up does not verify email ownership. | M1 removes the takeover risk. Add verification if marketing email is sent. |
| I3 | Refresh tokens are stateless, with no reuse detection. | Logout and password reset revoke all sessions (`tokenVersion`). Tokens last 7 days. |
| I4 | MongoDB in `docker-compose.yml` has no username/password. | Not published outside the Docker network. For production, enable MongoDB authentication or use a managed database with credentials. |
| I5 | The CSP allows inline styles. | Needed by the CSS-in-JS libraries; scripts stay restricted. |
| I6 | GitHub Actions are pinned to version tags, not commit SHAs. | Workflow permissions are read-only; pinning to SHAs is a further hardening step. |
| I7 | The original ScrollMe author's Firebase web key is in the git history (import commit). | Firebase web keys are public by design. It belongs to the original project, not this store, and is no longer in the code. |
| I8 | The newsletter has no double opt-in or unsubscribe endpoint. | No emails are sent by the app yet; add both before sending marketing email. |
| I9 | The signed-in user's name and email are kept in browser storage until logout. | No tokens are stored there (they are httpOnly cookies). |
| I10 | Backups are not encrypted, and `MONGODB_URI` is passed on the `mongodump` command line. | Store backups on encrypted storage. On shared hosts, use a mongodump config file for credentials. |
| I11 | A payment whose amount differs from the order is marked paid and flagged. | Deliberate, so money received is never lost track of; staff review flagged orders. |
| I12 | Forgot-password still saves a token only for registered emails (a small timing difference remains). | The large, mail-server delay was removed (L1); the remainder is milliseconds and rate limited. |

## Dependencies

| Package set | Before | After | Notes |
| --- | --- | --- | --- |
| API runtime | 1 high (zod) | **0** | |
| API development tools | 14 (1 critical, 6 high, 4 moderate, 3 low) | **2 low** | `npm audit fix`; faker removed. Remaining: ESLint (development only). |
| Storefront (all packages) | 65 (22 high, 34 moderate, 9 low) | **38** (8 high, 30 moderate) | `npm audit fix` plus `overrides` for nth-check, postcss, serialize-javascript, underscore, @tootallnate/once and @grpc/grpc-js; ajv bumped. |

None of the remaining 38 storefront advisories are in code sent to browsers. They are in Create React App's development server and build tools: webpack-dev-server, svgo, node-forge/selfsigned and postcss-selector-parser chains. They matter on a developer machine running `npm start`, not on the live site. Clearing them needs replacing Create React App (unmaintained) with Vite, which is the recommended next step.

## Secrets

No Stripe keys, webhook secrets, database passwords, JWT secrets or private keys are in the code or the git history. Secrets are read from environment variables, and the API refuses to start in production with weak or shared JWT secrets, the mock payment provider, or a live Stripe key that has not been explicitly allowed.
