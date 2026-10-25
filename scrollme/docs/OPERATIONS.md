# Operations runbook

## Health

| Check | Healthy response |
| --- | --- |
| `GET /healthz` (nginx) | `ok` |
| `GET /api/health` (API process) | `{"status":"ok"}` |
| `GET /api/ready` (API + database) | `{"status":"ok","db":"connected"}` — 503 when MongoDB is unreachable |

On Vercel there is no nginx, so use `/api/health` and `/api/ready`; failed starts appear in the project's *Logs* as `startup_failed`, and a missing `NODEJS_HELPERS=0` as `nodejs_helpers_enabled` ([VERCEL.md](VERCEL.md#4-check-it-works)).

Both Docker images define `HEALTHCHECK`s; `docker compose ps` shows their state. The API exits on start-up if configuration is invalid (the message lists each bad variable) and shuts down gracefully on `SIGTERM` (finishes in-flight requests, closes the database).

## Logs

The API writes one JSON object per line to stdout/stderr:

```json
{"time":"2026-10-23T03:31:57.120Z","level":"info","msg":"request","requestId":"…","method":"POST","path":"/api/orders","status":201,"ms":42,"userId":"…"}
```

- Every response carries `X-Request-Id`; nginx forwards its own `$request_id`. Users can quote it from error responses (`requestId`) to find the matching log line.
- Useful messages: `order_paid`, `late_payment`, `payment_amount_mismatch` (error), `checkout_failed`, `reservations_released`, `admin_action` (who changed which product/order), `stripe_webhook_rejected`, `mongodb_disconnected`, `unhandled_error`.
- Passwords, tokens and card data are never logged.
- Compose keeps 5 × 10 MB of logs per container; ship them to your log platform with the Docker logging driver of your choice and alert on `level":"error"`.

## Backups

`scripts/backup.sh` writes a gzip archive plus a SHA-256 checksum, and deletes archives older than `RETENTION_DAYS` (default 14). A partial dump never gets the final file name. Archives are created readable by the owner only (they contain customer details and password hashes); keep them on encrypted storage.

```bash
# Host with MongoDB Database Tools installed
MONGODB_URI='mongodb+srv://…/scrollme' BACKUP_DIR=/var/backups/scrollme scripts/backup.sh

# Inside the compose stack (archives land in ./backups on the host)
docker compose exec mongo sh -c 'mongodump --db scrollme --gzip --archive=/backups/scrollme-$(date -u +%Y%m%dT%H%M%SZ).archive.gz'
```

Schedule it (example cron, daily 02:15 UTC) and copy archives off the host (object storage with versioning):

```
15 2 * * * cd /opt/scrollme && MONGODB_URI=… BACKUP_DIR=/var/backups/scrollme scripts/backup.sh >> /var/log/scrollme-backup.log 2>&1
```

If you use MongoDB Atlas, also enable its continuous backups; the dump is an independent copy.

### Product photos

Uploaded photos are files, not database records: they live in `UPLOAD_DIR` (the `uploads` volume in `docker-compose.yml`). Back them up on the same schedule as the database:

```bash
docker run --rm -v scrollme_uploads:/data:ro -v "$PWD/backups:/backup" alpine \
  tar czf "/backup/uploads-$(date -u +%Y%m%dT%H%M%SZ).tgz" -C /data .
```

Photo file names are random and never reused, so restoring an older copy never overwrites a newer photo.

On Vercel, photos are stored in the project's Vercel Blob store (`products/<random>.webp`) instead of `UPLOAD_DIR`. The shop never deletes them (a product's photos stay even if the product is removed), so they are not lost on redeploys.

## Restore

```bash
# Rehearse into a separate database first
MONGODB_URI='mongodb://…' RESTORE_TO_DB=scrollme_restore_test scripts/restore.sh backups/scrollme-<stamp>.archive.gz --yes

# Real restore (asks you to type the database name; replaces existing collections)
MONGODB_URI='mongodb://…' scripts/restore.sh backups/scrollme-<stamp>.archive.gz
```

The script refuses archives whose checksum does not match. After a restore: restart the API (it rebuilds indexes on start), check `/api/ready`, and compare counts (`products`, `users`, `orders`). Orders paid in Stripe after the backup was taken are not in the restored database — reconcile them from the Stripe dashboard (Payments, filtered by date) using each payment's `orderId` metadata.

**Rehearsed on 2026-10-23** against the development database: backup 4.6 MB; restored counts matched exactly (24,324 products, 12 users, 5 orders, 3 carts); a modified archive was rejected by the checksum check.

## Shop details and legal pages

Fill in *Admin → Shop details* before launch: UK law requires an online shop to show its business name, a geographic (postal) address and an email address. They appear in the footer, on the Terms, Privacy, Returns and Delivery pages, the contact page and in every order email. The dashboard lists anything still missing.

The legal pages (`src/pages/legal/`) are drafts written for a UK consumer shop from what this code actually does. Have them reviewed before relying on them; if you change what the shop does (new payment method, analytics, marketing emails), update the Privacy policy too, and the `LAST_UPDATED` date.

## Messages and order emails

- *Admin → Messages* lists contact-page questions and sourcing requests. Each is also emailed to the contact email (or `NOTIFY_EMAIL`) with Reply-To set to the customer, so replying answers them; then mark it *Replied*.
- Customers are emailed when an order is paid (confirmation with the 14-day cancellation information), when it is marked *Shipped* (include the tracking number) and when it is marked *Refunded*. Each email is sent once per order; you get a new-order alert at the same time as the confirmation.
- Emails need `SMTP_URL`. A failed send never stops an order; it is logged as `email_failed` (search the API logs for it). Nothing is retried automatically, so contact the customer if one failed.

## Home page cover images

*Admin → Home page* changes the large photos at the top of the home page, without a code change: upload a photo (JPEG, PNG or WebP; landscape and at least 1600 px wide looks best), set the heading, text and button, and choose which page the button opens. Changes show on the next page load. Covers are saved in the database and their photos in the uploads folder, so both are in your normal backups.

## Monthly sales (order book)

*Admin → Order book* shows, for any month, what sold (product, sizes, quantity, sales), the stock left now, and month-by-month totals. Use **Download CSV** at the end of each month for your records or accountant.

- An order counts in the month it was **paid** (UK time), whatever its delivery status. Unpaid orders are not included; orders paid and later cancelled or refunded are shown as a separate total, not as sales.
- *Sales* is what customers paid: products plus delivery (plus tax only if `TAX_RATE` is set; by default prices include VAT). Stripe fees are not deducted, so compare with your Stripe payouts for money received.
- *In stock now* is today's stock, not the stock at the end of that month.

## Admin two-factor sign-in

Every administrator signs in with their password **and** a 6-digit code from an authenticator app on their phone. A new admin is asked to set it up the first time they open `/admin`, and gets ten one-time recovery codes to keep somewhere safe (a password manager). *Admin → Security* shows how many are left and lets an admin move to a new phone.

- **New phone, old one still working:** *Admin → Security → Set up a new authenticator*. The old app and codes keep working until the new one is confirmed.
- **Lost phone, has recovery codes:** sign in with *Use a recovery code instead*, then set up a new authenticator under *Admin → Security* (this also issues fresh recovery codes).
- **Lost phone and recovery codes:** after confirming who is asking (not by email alone), someone with server access runs
  `docker compose exec api npm run reset-mfa -- --email=owner@example.com`. Two-factor is turned off for that account and all its sessions end; the admin sets it up again on next sign-in.
- **`MFA_SECRET_KEY`** encrypts the authenticator secrets. Back it up with your other secrets and never change it casually: if it changes, authenticator codes stop working (the log shows `mfa_secret_unreadable`) and each admin must sign in with a recovery code and set up a new authenticator, or be reset as above. Restored database backups need the same key.

## Common incidents


| Symptom | What to do |
| --- | --- |
| Order shows "needs attention" in admin | Read the note. *Payment received after the reservation expired and stock is no longer available* → refund in Stripe, then mark the order Refunded. *Amount paid differs* → compare with Stripe before shipping. |
| Customer paid but order still "Awaiting payment" | Check Stripe → Developers → Webhooks for failed deliveries and resend. Opening the order page also re-checks Stripe. |
| Stock looks wrong | Unpaid orders hold stock for `RESERVATION_MINUTES` (default 35) and are released by the sweeper every minute. Adjust with *Admin → Products → Stock*; every change is logged as `admin_action`. |
| Many 429 responses | Rate limits: 20 failed sign-ins per 15 min per IP, 10 per account, 5 wrong two-factor codes per 15 min per account, 30 checkouts per 10 min, 300 API requests per minute. Check `TRUST_PROXY` — if it is wrong, all users share the proxy's IP. |
| Need to sign everyone out (e.g. leaked secret) | Rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET` and restart the API. Leave `MFA_SECRET_KEY` alone unless it leaked (see below). |
| One account compromised | Trigger a password reset for it; resetting revokes all of its sessions. For an admin, also run `reset-mfa` if the phone or recovery codes may be exposed, so they set up two-factor afresh. |
| Admin cannot get a code accepted | Check the phone's clock is set automatically (codes depend on the time). Each code works once, so wait for the next one. Then use a recovery code, or see [Admin two-factor sign-in](#admin-two-factor-sign-in). |
