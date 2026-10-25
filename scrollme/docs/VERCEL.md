# Launching Get It Sourced on Vercel

Vercel hosts the whole shop: the storefront pages and the API (as one Vercel Function). The database is MongoDB Atlas, product photos live in a Vercel Blob store and payments go through Stripe. Everything Vercel needs is already in the code (`vercel.json`, `api/index.js`); this guide covers the settings you enter in each service.

Allow about an hour. Do the steps in order.

## What you need

| Service | What for | Cost |
| --- | --- | --- |
| [Vercel](https://vercel.com) | Hosts the shop | **Pro plan** (about $20 a month). Vercel's free Hobby plan is for personal, non-commercial projects only, so a shop that takes payments needs Pro. |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | The database (products, orders, accounts) | Free cluster to start; a paid tier adds automatic backups |
| [Stripe](https://stripe.com) | Card, Apple Pay, Google Pay, PayPal and Klarna payments | Per-sale fees only |
| An email-sending service with SMTP (e.g. Brevo, Postmark, Resend, Mailgun) | Order confirmations, shipping emails, password resets, alerts to you | Usually free for low volumes |
| An authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password…) | Two-step sign-in to the admin | Free |

**Never paste secret keys into chats, emails or documents.** Type them only into the Vercel, Atlas and Stripe dashboards.

## 1. Create the database (MongoDB Atlas)

1. Create an Atlas account, then **Create a cluster**: the free tier is fine to start. Provider **AWS**, region **London (eu-west-2)** if it is offered, otherwise **Ireland (eu-west-1)**.
2. **Database Access → Add new database user**: authentication *Password*, click *Autogenerate secure password* and copy it somewhere safe. Role: *Read and write to any database*.
3. **Network Access → Add IP address → Allow access from anywhere** (`0.0.0.0/0`). Vercel's servers do not have fixed addresses, so the long password above is what protects the database.
4. **Connect → Drivers**: copy the connection string. Put your password in place of `<db_password>` and add the database name `getitsourced` after `.mongodb.net/`:

   ```
   mongodb+srv://shop:YOURPASSWORD@cluster0.abcde.mongodb.net/getitsourced?retryWrites=true&w=majority
   ```

   This whole line is your `MONGODB_URI`.

The database starts empty: no products and no accounts. You add your own stock in step 6.

## 2. Create the Vercel project

1. In Vercel: **Add New → Project** and import this GitHub repository.
2. **Root Directory**: click *Edit* and choose **`scrollme`**. Vercel then detects *Create React App*; leave the build settings as they are (they come from `vercel.json`).
3. Open **Environment Variables** and add the variables below. Tick **Production** only, so test deployments of other branches never touch your real database or payments (those test deployments will show the shop as unavailable, which is expected). Mark the secret ones as *Sensitive*.

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODEJS_HELPERS` | `0` — **required**. Without it Vercel reads each request before the shop can, so sign-in, checkout and forms would fail; the shop shows *Setup needed: add the environment variable NODEJS_HELPERS=0* until it is set. |
| `MONGODB_URI` | the connection string from step 1 |
| `JWT_SECRET` | a random value (see below) |
| `REFRESH_TOKEN_SECRET` | a different random value |
| `MFA_SECRET_KEY` | a third random value. It encrypts the admin two-step sign-in. **Keep a copy and never change it**, or admins will have to use their recovery codes. |
| `CRON_SECRET` | a fourth random value. Vercel sends it to the daily clean-up job so nobody else can run it. |
| `PAYMENT_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard, in **test mode** → Developers → API keys → *Secret key* (`sk_test_…`) |

**Random values**: each must be at least 32 characters and all four must be different. On a Mac, open Terminal and run `openssl rand -hex 32` once per value, or use your password manager's generator (64 characters, letters and numbers).

4. Click **Deploy**. When it finishes, note the address Vercel gives the project, e.g. `https://getitsourced.vercel.app`.

> **After changing any environment variable, redeploy**: *Deployments* → the latest one → *⋯* → *Redeploy*. Settings only take effect in a new deployment.

## 3. Connect photo storage (Vercel Blob)

Uploaded photos (products and home page covers) are stored in a Vercel Blob store.

1. In the project: **Storage → Create Database → Blob**. Choose a London region if asked, name it e.g. `getitsourced-photos`, and connect it to the project (all environments are fine). This adds `BLOB_READ_WRITE_TOKEN` automatically.
2. **Redeploy** (see above).

Until this is done, photo uploads say *Photo storage is not set up yet* and the admin dashboard reminds you.

Photos larger than 3.5 MB are shrunk in your browser before uploading (Vercel accepts at most 4.5 MB per upload); the shop then stores each as an optimised WebP without location data.

## 4. Check it works

Open `https://YOUR-ADDRESS/api/ready`. You should see:

```json
{"status":"ok","db":"connected"}
```

If you see something else:

| You see | Fix |
| --- | --- |
| *Setup needed: add the environment variable NODEJS_HELPERS=0…* | Add `NODEJS_HELPERS` = `0` and redeploy. |
| *The shop is temporarily unavailable…* | Open the project's **Logs** and look for `startup_failed`; the message says which setting is wrong. Usually `MONGODB_URI` (password, database name) or Atlas *Network Access*. Fix it and redeploy. |
| `"db":"disconnected"` | Atlas is unreachable: check *Network Access* allows `0.0.0.0/0`. |

## 5. Make yourself the admin

1. On the shop, **Sign up** with your own email address and a strong password.
2. In Atlas: **Browse Collections** → `getitsourced` → `users` → find your account → *Edit* (pencil). Change `roles` so it contains both values — `["user", "admin"]` — and click *Update*.
3. On the shop, sign out, sign back in and open **`/admin`**. Set up two-step sign-in: scan the QR code with your authenticator app, enter the code, and **save the ten recovery codes** somewhere safe (they are the only way in if you lose your phone).

(Alternative for developers: in a copy of the repository with Node.js installed, `npm ci` then `ADMIN_PASSWORD='…' MONGODB_URI='…' npm run create-admin -- --email=you@example.com` in `scrollme/backend` creates the admin account directly.)

## 6. Fill in the shop

In the admin:

- **Shop details**: legal name, business address and contact email are **required by UK law** before you take orders. They appear in the footer, the legal pages and emails.
- **Home page**: upload your cover images.
- **Bulk upload**: add your stock from a spreadsheet with photos ([BULK_UPLOAD.md](BULK_UPLOAD.md)), or add products one by one in **Products**.
- **Dashboard**: the checklist lists anything still missing.

## 7. Connect Stripe payments (test mode first)

1. Stripe Dashboard, **test mode** → **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://YOUR-ADDRESS/api/payments/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
2. Copy the endpoint's **Signing secret** (`whsec_…`) into a new Vercel variable `STRIPE_WEBHOOK_SECRET` and **redeploy**.
3. In Stripe **Settings → Payment methods**, turn on the methods you want (PayPal and Klarna need enabling; Apple Pay and Google Pay come with cards). If you can't enable one, add `PAYMENT_METHODS` with only the ones you have, e.g. `apple_pay,card,google_pay`, and redeploy.
4. Place a test order with card `4242 4242 4242 4242` (any future date, any CVC). In **Admin → Orders** it should turn **Paid** within a few seconds. If it stays *Awaiting payment*, check the webhook's delivery log in Stripe.

## 8. Turn on emails

Add these variables, then redeploy:

| Name | Value |
| --- | --- |
| `SMTP_URL` | from your email service, in the form `smtps://USERNAME:PASSWORD@smtp.example.com:465`. If the username or password contains symbols such as `@`, `:` or `/`, ask the service for an SMTP key without them, or URL-encode them. |
| `MAIL_FROM` | e.g. `Get It Sourced <orders@your-domain.co.uk>`; the domain must be verified with the email service |
| `NOTIFY_EMAIL` | optional: where new-order and contact-form alerts go. Defaults to the contact email in *Shop details*. |

Test it with **Forgot password** on the sign-in page, then place another test order: you should get the confirmation, and the shop email gets the new-order alert.

## 9. Your own domain (optional)

1. Project **Settings → Domains → Add**, e.g. `getitsourced.co.uk`, and follow Vercel's DNS instructions at the company you bought the domain from.
2. Add the variable `APP_URL` = `https://getitsourced.co.uk` (used in payment return links and emails) and redeploy.
3. In **Domains**, edit the `….vercel.app` address and set it to **redirect** to your domain, so everyone uses one address (signing in and checkout only work on the shop's main address and its deployment addresses).
4. In Stripe, change the webhook's URL to `https://getitsourced.co.uk/api/payments/stripe/webhook` (same signing secret).

## 10. Going live with real payments

1. Activate your Stripe account (business details and bank account).
2. In Stripe **live mode**: copy the live secret key (`sk_live_…`) into `STRIPE_SECRET_KEY`, add `STRIPE_ALLOW_LIVE` = `true` (the shop refuses live keys without it), create the live webhook exactly as in step 7 and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Redeploy.
3. Buy something cheap with a real card and check it turns **Paid**. Refund it in Stripe (*Payments* → the payment → *Refund*), then set the order to **Refunded** in **Admin → Orders** (this returns the stock and emails the customer).
4. Have the **Terms, Privacy, Returns and Delivery** pages checked before you rely on them.

## How it runs on Vercel (for reference)

- `vercel.json` installs the storefront and the API, builds the storefront, sends every `/api/…` request to the function in `api/index.js`, adds the security headers (the same as the nginx setup in `deploy/nginx`) and runs the function in London (`lhr1`).
- **Unpaid orders** hold their stock for `RESERVATION_MINUTES` (35). Vercel Functions cannot run a timer, so expired holds are released as visitors use the shop (checked at most once a minute) and by a daily Vercel Cron job (`/api/cron/release-expired`, 03:17 UTC) as a backstop.
- **Request size**: Vercel accepts at most 4.5 MB per request. Photos are shrunk in the browser first; spreadsheet imports are limited to 2 MB.
- **Rate limits** on sign-in, two-step codes, sign-ups, password-reset emails, the contact form and checkout are counted in the database (`ratelimits` collection, cleared automatically), so they hold however many copies of the function Vercel runs. Only the general 300-requests-a-minute flood guard is counted per copy.
- **Logs**: the project's *Logs* tab shows the API's log lines (see [OPERATIONS.md](OPERATIONS.md#logs) for what they mean).
- **Backups**: the free Atlas tier has no automatic backups. Upgrade the cluster to a tier with backups once you have orders, or run `scripts/backup.sh` regularly from a computer ([OPERATIONS.md](OPERATIONS.md#backups)). Photos stay in the Blob store until deleted.
- **Settings that keep their defaults unless you add them**: delivery £3.99, free from £100 (`SHIPPING_STANDARD`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_EXPRESS`), prices include VAT (`TAX_RATE=0`), UK delivery only (`SHIP_TO_COUNTRIES=GB`). The full list is in [DEPLOYMENT.md](DEPLOYMENT.md#2-environment-variables) and `backend/.env.example`.
- **Google sign-in** is off unless the `REACT_APP_FIREBASE_*` and `FIREBASE_PROJECT_ID` variables are set.
