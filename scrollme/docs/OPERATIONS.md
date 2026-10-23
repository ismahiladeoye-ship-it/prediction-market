# Operations runbook

## Health

| Check | Healthy response |
| --- | --- |
| `GET /healthz` (nginx) | `ok` |
| `GET /api/health` (API process) | `{"status":"ok"}` |
| `GET /api/ready` (API + database) | `{"status":"ok","db":"connected"}` — 503 when MongoDB is unreachable |

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

`scripts/backup.sh` writes a gzip archive plus a SHA-256 checksum, and deletes archives older than `RETENTION_DAYS` (default 14). A partial dump never gets the final file name.

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

## Restore

```bash
# Rehearse into a separate database first
MONGODB_URI='mongodb://…' RESTORE_TO_DB=scrollme_restore_test scripts/restore.sh backups/scrollme-<stamp>.archive.gz --yes

# Real restore (asks you to type the database name; replaces existing collections)
MONGODB_URI='mongodb://…' scripts/restore.sh backups/scrollme-<stamp>.archive.gz
```

The script refuses archives whose checksum does not match. After a restore: restart the API (it rebuilds indexes on start), check `/api/ready`, and compare counts (`products`, `users`, `orders`). Orders paid in Stripe after the backup was taken are not in the restored database — reconcile them from the Stripe dashboard (Payments, filtered by date) using each payment's `orderId` metadata.

**Rehearsed on 2026-10-23** against the development database: backup 4.6 MB; restored counts matched exactly (24,324 products, 12 users, 5 orders, 3 carts); a modified archive was rejected by the checksum check.

## Common incidents

| Symptom | What to do |
| --- | --- |
| Order shows "needs attention" in admin | Read the note. *Payment received after the reservation expired and stock is no longer available* → refund in Stripe, then mark the order Refunded. *Amount paid differs* → compare with Stripe before shipping. |
| Customer paid but order still "Awaiting payment" | Check Stripe → Developers → Webhooks for failed deliveries and resend. Opening the order page also re-checks Stripe. |
| Stock looks wrong | Unpaid orders hold stock for `RESERVATION_MINUTES` (default 35) and are released by the sweeper every minute. Adjust with *Admin → Products → Stock*; every change is logged as `admin_action`. |
| Many 429 responses | Rate limits: 20 failed sign-ins per 15 min per IP, 30 checkouts per 10 min, 300 API requests per minute. Check `TRUST_PROXY` — if it is wrong, all users share the proxy's IP. |
| Need to sign everyone out (e.g. leaked secret) | Rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET` and restart the API. |
| One account compromised | Trigger a password reset for it; resetting revokes all of its sessions. |
