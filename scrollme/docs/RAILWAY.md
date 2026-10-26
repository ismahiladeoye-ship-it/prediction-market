# Launching Get It Sourced on Railway

Railway is a good alternative to Vercel for a shop that takes payments: it runs
a normal always-on server, and unlike Vercel's free plan it allows commercial
use on its paid plans. The whole shop (storefront **and** API) runs as **one
service** from one container, with MongoDB Atlas for the database and a Railway
volume for uploaded photos.

Allow about an hour. Do the steps in order. **Type secret keys only into the
Railway, Atlas and Stripe dashboards — never into a chat, email or document.**

## What you need

| Service | For | Cost |
| --- | --- | --- |
| [Railway](https://railway.app) | Hosts the shop | No free tier for ongoing use; the Hobby plan is about $5/month and includes $5 of usage. Commercial use is allowed on paid plans. |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | The database | Free tier to start |
| [Stripe](https://stripe.com) | Payments | Per-sale fees only |
| An SMTP email service (Brevo, Postmark, Resend, Mailgun…) | Order and account emails | Usually free at low volume |
| An authenticator app | Two-step admin sign-in | Free |

## 1. Create the database (MongoDB Atlas)

Follow [VERCEL.md §1](VERCEL.md#1-create-the-database-mongodb-atlas) — it is the
same for any host. You end with a `MONGODB_URI` like:

```
mongodb+srv://shop:YOURPASSWORD@cluster0.abcde.mongodb.net/getitsourced?retryWrites=true&w=majority
```

The database starts empty; you add your own stock in step 7.

## 2. Create the Railway project

1. In Railway: **New Project → Deploy from GitHub repo** and pick your
   `prediction-market` repository. (Install the Railway GitHub app if asked.)
2. Open the new service → **Settings**:
   - **Root Directory**: `scrollme`
   - **Build → Builder**: `Dockerfile`
   - **Build → Dockerfile Path**: `deploy/railway.Dockerfile`

   This image builds the storefront and runs it together with the API in one
   container. Railway sets the `PORT` for you; the app listens on it.

## 3. Add the settings

Service → **Variables → + New Variable**, and add these. Keep the three secrets
different and at least 32 characters each (generate with `openssl rand -hex 32`
or a password manager).

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | the connection string from step 1 |
| `JWT_SECRET` | a random value |
| `REFRESH_TOKEN_SECRET` | a different random value |
| `MFA_SECRET_KEY` | a third random value. Encrypts admin two-step sign-in — **keep a copy and never change it.** |
| `PAYMENT_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY` | Stripe → test mode → Developers → API keys → *Secret key* (`sk_test_…`) |
| `TRUST_PROXY` | `1` (Railway runs one proxy in front of the app) |

`APP_URL` and `CLIENT_ORIGINS` come next, once you have the address.
`SERVE_STATIC`, `STATIC_DIR` and `UPLOAD_DIR` are already set by the image — don't add them.

## 4. Give it an address, then point the shop at it

1. Service → **Settings → Networking → Public Networking → Generate Domain**.
   Railway gives you something like `get-it-sourced-production.up.railway.app`.
2. Add two more variables with that address (include `https://`):
   - `APP_URL` = `https://YOUR-ADDRESS`
   - `CLIENT_ORIGINS` = `https://YOUR-ADDRESS`

   **This matters:** until `CLIENT_ORIGINS` is your real address, sign-in and
   checkout are refused as cross-site. Payment return links and emails use `APP_URL`.
3. Railway redeploys on each change. Wait for the new deploy to go live.

## 5. Keep uploaded photos (a volume)

Photos are files on disk, which a plain container would lose on each deploy. Add
a volume so they persist:

- Service → **Settings → Volumes → + New Volume**, mount path **`/app/uploads`**.

(Alternatively, store photos in a cloud bucket later; for now the volume is simplest.)

## 6. Check it works

Open `https://YOUR-ADDRESS/api/ready`. You should see:

```json
{"status":"ok","db":"connected"}
```

If not, open the service's **Deploy Logs**:

| Problem | Fix |
| --- | --- |
| `startup_failed` | A setting is wrong — usually `MONGODB_URI` (password, database name) or Atlas **Network Access** not allowing `0.0.0.0/0`. |
| `"db":"disconnected"` | Atlas is unreachable; check Network Access. |
| Sign-in or checkout gives "cross-site request blocked" | `CLIENT_ORIGINS` doesn't match your address exactly (step 4). |

The shop itself is at `https://YOUR-ADDRESS`.

## 7. Make yourself the admin, then fill in the shop

Same as [VERCEL.md §5–6](VERCEL.md#5-make-yourself-the-admin):

1. **Sign up** on the shop with your email and a strong password.
2. In Atlas → **Browse Collections** → `getitsourced` → `users` → your account
   → set `roles` to `["user", "admin"]` → **Update**.
3. Sign out and back in, open **`/admin`**, set up two-step sign-in and save the
   ten recovery codes.
4. In the admin, fill in **Shop details** (your business address and email are
   required by UK law), upload your **Home page** covers, and add stock with
   **Bulk upload**.

## 8. Connect Stripe (test mode first)

Same as [VERCEL.md §7](VERCEL.md#7-connect-stripe-payments-test-mode-first):

1. Stripe (test mode) → **Developers → Webhooks → Add endpoint**:
   `https://YOUR-ADDRESS/api/payments/stripe/webhook`, events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`.
2. Copy its **Signing secret** into a Railway variable `STRIPE_WEBHOOK_SECRET`.
3. Place a test order with card `4242 4242 4242 4242`; it should turn **Paid** in
   **Admin → Orders**.

## 9. Turn on emails

Add these variables (see [VERCEL.md §8](VERCEL.md#8-turn-on-emails) for detail):
`SMTP_URL`, `MAIL_FROM`, and optionally `NOTIFY_EMAIL`. Test with **Forgot
password** and a test order.

## 10. Your own domain, and going live

- **Custom domain**: Settings → Networking → Custom Domain, follow Railway's DNS
  steps, then set `APP_URL` and `CLIENT_ORIGINS` to the new address and redeploy.
- **Real payments**: activate Stripe, switch `STRIPE_SECRET_KEY` to the live key,
  add `STRIPE_ALLOW_LIVE=true`, create the live webhook and set its
  `STRIPE_WEBHOOK_SECRET`, redeploy, and test with a real card you refund. Have
  the Terms, Privacy, Returns and Delivery pages checked first.

## How it runs on Railway (for reference)

- One service from `deploy/railway.Dockerfile`: the Node process serves the built
  storefront and the API together, so cookies are first-party and there is
  nothing to wire between a front and back end.
- **Expired unpaid orders** release their stock automatically — the always-on
  server sweeps every minute, so no cron job is needed (that was only for
  Vercel's serverless functions).
- **Photos** are stored on the mounted volume at `/app/uploads` and served from
  `/api/uploads/...`.
- **Rate limits** on sign-in, codes, sign-ups, reset emails, the contact form and
  checkout are shared in the database, so they hold even if you scale to more than
  one instance.
- **Security headers** (CSP, HSTS, frame, referrer, permissions) are sent by the
  app itself — the same set the nginx setup uses.
- Delivery prices, VAT and shipping countries keep their defaults unless you add
  the matching variables (see [DEPLOYMENT.md §2](DEPLOYMENT.md#2-environment-variables)).
