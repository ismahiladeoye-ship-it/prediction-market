# Deploying Get It Sourced

The supported layout is three containers behind a TLS-terminating proxy:

```
browser ──HTTPS──▶ TLS proxy / load balancer ──▶ web (nginx :8080) ──/api──▶ api (Node :8080) ──▶ MongoDB
```

The storefront and API share one origin, so session cookies are first-party and `COOKIE_SAMESITE=lax` works. Splitting them across domains is possible (`COOKIE_SAMESITE=none`, HTTPS required, `CLIENT_ORIGINS` set to the storefront origin, storefront built with `REACT_APP_API_URL=https://api.example.com/api`), but same-origin is simpler and safer.

## 1. Production database

Use a managed MongoDB 7 (e.g. MongoDB Atlas) or the `mongo` service in `docker-compose.yml` with its `mongo-data` volume.

- Create a dedicated database user with `readWrite` on the `scrollme` database only.
- Restrict network access to the API hosts.
- Enable provider backups **and** schedule `scripts/backup.sh` (see [OPERATIONS.md](OPERATIONS.md)).
- Set `MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.example.net/scrollme?retryWrites=true&w=majority`.
- Load the catalogue once: `docker compose run --rm api npm run seed -- --force` (catalogue only; demo users are never created in production). Create the first administrator with `npm run create-admin`.

## 2. Environment variables

API (`backend/.env`, from `backend/.env.example`):

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | production connection string |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | two different random values, ≥ 32 chars: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `APP_URL` | public storefront URL, e.g. `https://shop.example.com` (payment return links, emails) |
| `CLIENT_ORIGINS` | same origin, e.g. `https://shop.example.com` |
| `TRUST_PROXY` | number of proxies in front of the API (`1` for nginx only, `2` with a load balancer in front of nginx) |
| `CURRENCY`, `TAX_RATE`, `SHIPPING_STANDARD`, `SHIPPING_EXPRESS`, `FREE_SHIPPING_THRESHOLD` | your pricing (see note below). Defaults: `gbp`, prices include VAT, £4.99 standard delivery that is free from £100, no express |
| `SHIP_TO_COUNTRIES` | countries you deliver to; default `GB` (checkout accepts UK addresses only and checks the postcode) |
| `PAYMENT_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | test-mode keys first (`sk_test_…`, `whsec_…`) |
| `PAYMENT_METHODS` | e.g. `apple_pay,card,paypal,klarna,google_pay` — only methods enabled in Stripe |
| `SMTP_URL`, `MAIL_FROM` | for password-reset emails |
| `FIREBASE_PROJECT_ID` | only if Google sign-in is enabled |

Storefront build arguments (`docker compose build` / `Dockerfile` `ARG`s): `REACT_APP_API_URL` (default `/api`), `REACT_APP_CURRENCY_SYMBOL`, and the four `REACT_APP_FIREBASE_*` values for Google sign-in.

> **Prices.** The bundled catalogue was scraped with Indian-rupee prices (e.g. "Rs. 1699"). The storefront shows them with `REACT_APP_CURRENCY_SYMBOL` (default `£`) and the API charges them in `CURRENCY` (default `gbp`), so they must be re-priced (or replaced with your own stock) before taking real payments. If you change currency, change both settings.
>
> **Delivery.** The storefront says "Free UK delivery on orders over £100" and "30-day returns" (announcement bar, product pages, FAQ, About). If you change `FREE_SHIPPING_THRESHOLD` or ship abroad, update `announcements` and `perks` in `src/data.js`, the FAQ and the About page to match. The bag shows "Spend £X more for free UK delivery" from the API's threshold automatically.

## 3. Payments (Stripe test mode)

1. Create a Stripe account and stay in **test mode**. Put the test secret key in `STRIPE_SECRET_KEY`.
2. **Webhook**: Developers → Webhooks → add endpoint `https://shop.example.com/api/payments/stripe/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:8080/api/payments/stripe/webhook`.
3. **Payment methods** (Settings → Payment methods):
   - *Cards* — on by default. **Apple Pay** and **Google Pay** are wallets on the card method and appear automatically on Stripe Checkout on supported devices; Stripe hosts Checkout, so no domain verification is needed for it.
   - *PayPal* and *Klarna* — enable them if Stripe offers them for your account; availability depends on the account's country and the currency (check Stripe's documentation for each method). Remove any you cannot enable from `PAYMENT_METHODS`, and the storefront stops offering them.
   - Skrill is not supported by Stripe and is not offered.
4. Test a purchase with every method using [Stripe's test cards and wallets](https://docs.stripe.com/testing): `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines. Confirm the order turns **Paid**, the admin can ship it, and a cancelled order returns its stock.
5. Going live: switch to live keys **and** set `STRIPE_ALLOW_LIVE=true` (the API refuses live keys otherwise), create the live webhook, and repeat step 4 with a small real payment you refund.

Card details are only ever entered on Stripe's hosted page; Get It Sourced stores the payment status and Stripe's reference, never card data. The local `mock` provider exists for development and automated tests and is rejected when `NODE_ENV=production`.

## 4. Build and run

```bash
cp backend/.env.example backend/.env   # fill in as above
docker compose up -d --build
docker compose ps                      # all services "healthy"
curl -fsS http://localhost:8080/healthz && curl -fsS http://localhost:8080/api/ready
```

Put the TLS proxy (Caddy, Traefik, a cloud load balancer…) in front of `web:8080`. nginx already sends HSTS, CSP, frame, referrer and permissions headers; the API sends its own `default-src 'none'` CSP.

Without Docker: build the storefront (`npm ci && npm run build`), serve `build/` with `deploy/nginx/default.conf.template` (replace `${API_UPSTREAM}`), and run the API with `NODE_ENV=production node server.js` under a process manager.

## 5. Go-live checklist

- [ ] CI green on the commit being deployed (API, storefront, end-to-end, Docker builds).
- [ ] `NODE_ENV=production`; secrets generated, not copied from examples; `.env` not committed.
- [ ] `GET /api/ready` returns `{"status":"ok","db":"connected"}`.
- [ ] Stripe test purchase for each enabled payment method; webhook deliveries succeed in the Stripe dashboard.
- [ ] Password reset email arrives (SMTP configured).
- [ ] First admin created; demo users absent (`db.users.find({username:"johndoe"})` is empty).
- [ ] Backup job scheduled and one restore rehearsed ([OPERATIONS.md](OPERATIONS.md)).
- [ ] Logs collected from both containers.
- [ ] Prices and currency correct.
