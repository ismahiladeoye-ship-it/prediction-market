# Get It Sourced API

Express + Mongoose REST API for the Get It Sourced store (based on ScrollMe). Sessions use httpOnly cookies (`accessToken`, 15 minutes; `refreshToken`, 7 days, sent only to `/api/auth`). Every request body and query is validated with zod; money is computed in integer cents.

## Setup

```bash
cp .env.example .env     # every variable is documented in the file
npm install
npm run seed             # development data (refuses to run in production)
npm run dev              # nodemon; `npm start` for plain node
```

Configuration is validated at start-up (`api/config/env.js`). In production the server refuses to start with weak or shared JWT secrets, `PAYMENT_PROVIDER=mock`, or a live Stripe key unless `STRIPE_ALLOW_LIVE=true`.

### Administrators

```bash
ADMIN_PASSWORD='a-strong-password' npm run create-admin -- --email=owner@example.com --username=owner --first=Store --last=Owner
```
Running it for an existing email grants the admin role instead.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm start` / `npm run dev` | Run the API |
| `npm test` | Jest suite on MongoDB (in-memory, or `TEST_MONGODB_URI`) |
| `npm run lint` | ESLint + Prettier |
| `npm run seed [-- --reset] [-- --limit=500]` | Seed catalogue (+ demo users outside production) |
| `npm run create-admin` | Create or promote an administrator |

## Endpoints

Auth column: — public, **U** signed-in user, **A** admin.

| Method & path | Auth | Description |
| --- | --- | --- |
| `GET /api/health` | — | Liveness |
| `GET /api/ready` | — | Readiness (database ping) |
| `POST /api/auth/register` | — | Create account, starts session |
| `POST /api/auth/login` | — | `{ username, password }` (username or email) |
| `POST /api/auth/logout` | — | Ends session and revokes all refresh tokens |
| `POST /api/auth/refresh-token` | cookie | Rotates tokens |
| `GET /api/auth/me`, `GET /api/auth/status` | U | Current user |
| `POST /api/auth/forgot-password` / `reset-password` | — | Emailed, single-use, 30-minute token |
| `POST /api/auth/google` | — | Firebase ID token → session (needs `FIREBASE_PROJECT_ID`) |
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
| `GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/:id`, `POST /api/admin/products/:id/stock` | A | Product management (`DELETE` hides) |
| `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status` | A | Fulfilment; only allowed status transitions |
| `POST /api/product/add`, `PUT /api/product/update/:id`, `DELETE /api/product/delete/:id` | A | Original endpoints, now admin-only |

Order statuses: `pending_payment → paid → processing → shipped → delivered`, with `cancelled` (stock returned) and `refunded` where allowed.

Errors are JSON: `{ "message": "...", "details": [{ "field", "message" }] }`.
