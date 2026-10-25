# Get It Sourced — security audit

**Date:** 23 Oct 2026, re-audited 25 Oct 2026 before the Vercel launch · **Scope:** the whole `scrollme/` codebase — API (`backend/`), storefront (`src/`), end-to-end tests, Docker/nginx/CI and Vercel configuration, backup scripts and the git history.

## Re-audit before the Vercel launch (25 Oct 2026)

**Scope:** everything added since the first audit — bulk upload (photos and spreadsheets), admin two-step sign-in, the order book, home page cover images, contact messages, shop details, legal pages, order emails — and the Vercel setup (serverless entry point, Blob photo storage, daily cron job, settings taken from Vercel, `vercel.json` headers). Dependency audits and the secret scan were run again over the whole repository and the history since.

**Method:** the same as the first audit (below): manual review of every new or changed file, then probes against a running copy of the API with rate limits switched on, to confirm each suspected issue before fixing it and again after.

| | Found | Fixed | Left (with reason) |
| --- | --- | --- | --- |
| Critical / High | 0 | — | — |
| Medium | 2 | 2 | 0 |
| Low | 1 | 1 | 0 |
| Informational / accepted | 5 | — | 5 (below) |
| Dependency advisories | API runtime **0**; API development tools 2 low (ESLint); storefront 36 (8 high, 28 moderate, down from 38) | — | All 36 are in Create React App's development server and build tools; none are in code sent to browsers |

No finding let anyone read other customers' data, change prices, pay less than the order total, get into the admin or run code on the server.

### Fixed

| ID | Finding | Fix | Test |
| --- | --- | --- | --- |
| M4 | **Password-reset emails could be sent without limit.** The sign-in limiter only counts failed requests, and *Forgot password* always answers "sent" (so it never reveals which emails have accounts), so it was never counted. A probe sent **40 reset emails to one customer** from one computer in a few seconds. Anyone could flood a customer's inbox, use up the shop's email allowance and get the shop's emails marked as spam. | Every request now counts: 10 an hour per IP, and 3 an hour per email address from any number of IPs. The reply is the same for unknown addresses. The same probe now gets 3 emails through. | `ratelimit.test.js` "password-reset emails" |
| M5 | **Rate limits were kept in each server's memory.** On Vercel the API runs as many short-lived copies; each kept its own counts and started from zero, so spreading requests over copies multiplied the attempts allowed at passwords, two-step codes, sign-ups, reset emails, contact messages and checkouts. | These limits are now counted in the database (`ratelimits` collection): one atomic update per request, entries delete themselves when their window ends, and keys are stored as hashes rather than emails or IP addresses. The general 300-requests-a-minute flood guard stays in memory, behind Vercel's own DDoS protection. | `ratelimit.test.js` "shared counters" (sharing between copies, window reset, hashing, expiry, successful sign-ins not counted) |
| L17 | **Sign-ups were not limited** (only failed attempts were counted). A probe created 30 accounts in a row from one computer. Each account can hold up to 3 unpaid orders that reserve stock for 35 minutes, so unlimited accounts got round that limit (L5) and could make products look sold out. | 10 sign-ups per hour per IP, successful or not. Real customers sharing an address (mobile networks, offices) are well under this. | `ratelimit.test.js` "sign-ups" |

### Informational and accepted

| ID | Note | Why it stays |
| --- | --- | --- |
| I13 | Someone controlling many IP addresses can still create accounts and hold stock in unpaid orders for up to 35 minutes each. | Limited to 3 unpaid orders per account, 30 checkouts per 10 minutes and 10 sign-ups per hour per IP, and 20 of any one item. Stripe needs sessions to last at least 30 minutes. Unpaid orders are listed in *Admin → Orders* and can be cancelled there. |
| I14 | Contact messages can contain links, and they reach the owner's inbox. | Messages are shown and emailed as plain text (HTML is escaped). Treat links from strangers with the usual care. |
| I15 | If the environment variables were also given to Vercel *Preview* deployments, test deployments of other branches would use the live database and Stripe keys. | [VERCEL.md](../VERCEL.md) says to tick *Production* only. Vercel also protects preview deployments with a login by default. |
| I16 | Product photos in the Blob store can be opened by anyone with the link. | Intended: they are shown on the shop. Names are random (128 bits) and the upload token stays on the server. |
| I17 | The general flood guard (300 requests a minute per IP) is counted per copy on Vercel. | Writing to the database on every request would cost more than it protects; Vercel's DDoS protection is in front of it, and every security-sensitive limit is shared (M5). |

### Checked and found sound

- **Admin access**: every `/api/admin` route checks the admin role in the database *and* that two-step sign-in was completed in this session. A password alone only gets a separately signed 5-minute cookie that works nowhere else.
- **Two-step codes**: authenticator secrets are encrypted (AES-256-GCM) and each code is accepted once, claimed atomically. Recovery codes are hashed and generated without bias. The demo admin's known secret is never created in production, because seeding refuses to create demo users there.
- **Photo uploads**: admins only. Files are limited to 15 MB (4.5 MB on Vercel), decoded with a 50-megapixel limit against decompression bombs, and re-encoded to WebP, which drops EXIF/GPS and anything hidden in the file. Names are random.
- **Bulk import**: limited to 2 MB and 1,000 rows. Photo links must be uploaded photos or `http(s)` addresses, and every row is validated like a manual edit.
- **Cover images**: photo links cannot break out of the CSS `url()` (quotes, brackets and spaces are refused). Buttons only link to pages on the shop (`//` and `/\` are refused).
- **Shop details and storefront**: social links must be `https` links on Instagram, TikTok or WhatsApp. Everything is rendered as text; the storefront has no `dangerouslySetInnerHTML`. Post-sign-in redirects come from in-app state, not the URL.
- **Emails**: everything typed by customers or admins is HTML-escaped. Reply-to addresses are validated, and line breaks cannot reach email headers. The contact form never emails the sender, so it cannot be used to send mail to strangers.
- **CSV downloads**: cells starting with `=`, `+`, `-` or `@` are prefixed so spreadsheets treat them as text, not formulas.
- **Vercel**:
  - The cron endpoint needs `CRON_SECRET` (compared in constant time; 404 otherwise).
  - The API refuses to run with Vercel's request helpers on.
  - Allowed origins are the shop's address plus this deployment's own addresses.
  - Vercel overwrites `X-Forwarded-For`, so `TRUST_PROXY=1` yields the real client IP.
  - API responses are `no-store`, and the pages carry the same CSP, HSTS and frame headers as the nginx setup.
  - No source maps are published.
  - Payment and email links use `APP_URL`, never the request's `Host` header.
- **Secrets**: no keys or passwords in the files or in the history since the first audit (only the placeholder connection string in VERCEL.md).

**Tests after the fixes:** 155 API tests (7 new), 28 storefront unit tests and 25 browser tests (one phone-only test is skipped on desktop), all passing.

### Active penetration test (25 Oct 2026)

Beyond reading the code, hostile requests were fired at a running copy of the API — one standing in for each common web attack class — and every one was refused. There is no PHP in this stack, so PHP-specific attacks (local/remote file include, `php://` wrappers, object injection) do not apply; the equivalent risks for Node/Express/MongoDB are covered below. The probes are kept as a regression suite (`backend/__tests__/pentest.test.js`, 13 tests) so a later change cannot quietly reopen any of them.

| Attack tried | Result |
| --- | --- |
| **NoSQL / operator injection** — `{"$ne":null}` / `{"$gt":""}` as username and password; `category[$ne]=` in a query string | Refused (400). Every field is parsed to a plain string or number by zod before any query, so Mongo operators never reach the database. |
| **Authentication bypass by JWT tampering** — `alg:none`, a token signed with a guessed secret, an `mfa-pending` or `refresh` token used as an access token | All rejected (401). Verification is pinned to HS256 and checks the token type. |
| **Privilege escalation / mass assignment** — `roles:["admin"]`, `isAdmin:true`, `tokenVersion:99` sent in the sign-up body | Ignored. The schema drops unknown fields and the role is hard-set to `user`. |
| **IDOR** — one signed-in customer requesting and trying to pay for another customer's order | 404 both times (it does not even confirm the order exists). |
| **CSRF** — a state-changing POST from `https://evil.example` | Blocked (403) by the Origin check. |
| **Path traversal** — `/api/uploads/..%2f..%2fetc/passwd` and encoded variants | Refused (403); the static handler stays within the uploads folder. |
| **Prototype pollution** — `__proto__` payload in a JSON body | No pollution; `Object.prototype` is untouched. |
| **ReDoS / oversized input** — a 5,000-character search term | Handled in a few milliseconds (the term is length-capped and the regex is escaped). |
| **Stored XSS** — `<script>` in a product name, address or message | Stored as text and HTML-escaped wherever it is shown or emailed; the storefront uses no `dangerouslySetInnerHTML`. |
| **Email header injection** — a newline and `Bcc:` in a contact subject | Cannot add a header; the mail library folds it into the subject text. |
| **Response hardening** | `X-Powered-By` hidden, API CSP `default-src 'none'`, `Cache-Control: no-store`, non-JSON bodies on JSON endpoints refused (415). |
| **Webhook forgery** — a Stripe webhook with a forged signature | Rejected (400); only a correct signature is accepted (verified separately in `backend/__tests__/vercel.test.js`). |

**Tests after this round:** 168 API tests (13 of them this penetration suite), 28 storefront unit tests and 25 browser tests, all passing.

**Recommended next steps (not needed for launch):**
- Replace Create React App with Vite to clear the 36 build-tool advisories.
- Add email verification at sign-up, and double opt-in for the newsletter, before sending marketing email.
- Turn on Atlas backups once orders start.

## 23 Oct 2026 audit: result in brief

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

No Stripe keys, webhook secrets, database passwords, JWT secrets or private keys are in the code or the git history. Secrets are read from environment variables, and the API refuses to start in production with weak or shared JWT secrets, a missing or weak `MFA_SECRET_KEY`, the mock payment provider, or a live Stripe key that has not been explicitly allowed.

## After the audit: two-factor sign-in for admins

Added at the owner's request (not a finding above; admin passwords were already hashed with bcrypt and rate limited). Admin accounts now need an authenticator-app code (TOTP, RFC 6238) after the password:

- `/api/admin/*` and the original product-write endpoints require two-factor to be set up on the account **and** completed in the current session (an `mfa` claim in the signed session tokens, kept on refresh). A password alone, a password reset or Google sign-in only gets as far as a 5-minute, separately signed `mfaPending` cookie that is accepted nowhere else; session tokens carry a `typ` claim so one kind cannot stand in for another.
- Authenticator secrets are encrypted with AES-256-GCM under `MFA_SECRET_KEY` (required in production, distinct from the JWT secrets). Recovery codes (10, single use) are stored as SHA-256 hashes; codes are random, from a 32-character alphabet, 50 bits each.
- Each 6-digit code is accepted once (the last used time step is stored and claimed atomically, so parallel replays fail); ±30 s clock drift is allowed. Wrong codes are limited to 5 per 15 minutes per account, on top of the per-IP sign-in limit.
- Turning it on, or moving to a new phone, signs the account out everywhere else. Lost phone and codes: `npm run reset-mfa` on the server (see OPERATIONS.md).
- Covered by `backend/__tests__/mfa.test.js` (10 tests) and an end-to-end test of a new admin's setup and recovery-code sign-in.

## After the audit: contact form, shop details and emails

- `POST /api/contact` is limited to 5 messages per hour per IP and has a hidden bot field; it never sends an automatic reply, so it cannot be used to make the shop email other people. Messages are only readable by admins with two-factor sign-in.
- Emails escape everything customers or admins typed (product names, addresses, messages) in their HTML version; links in emails use `APP_URL`.
- Shop details are admin-only; social links must be `https://` links on Instagram, TikTok or WhatsApp. Covered by `backend/__tests__/launch.test.js`.

