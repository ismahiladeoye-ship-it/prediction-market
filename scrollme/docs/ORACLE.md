# Launching Get It Sourced free on an Oracle Cloud server

Oracle Cloud's **Always Free** tier gives you a small always-on server for £0 a
month, permanently. It's the one genuinely free way to run this shop *properly*
— your product photos and data persist, the site never sleeps, and commercial
use is allowed. The trade-off is that it's **hands-on**: you work on the command
line over SSH, not by tapping "Deploy".

**Be honest with yourself about this path.** You'll need:

- a **computer** (or an SSH app on your phone, e.g. Termius) — not just a browser;
- a **domain name** (about £8/year), because card payments require HTTPS, which
  needs a domain;
- about **an hour**, and willingness to copy/paste terminal commands;
- a **credit/debit card** for Oracle's identity check (Always Free resources are
  never charged).

If that sounds like too much, **Railway (~£4/month, see [RAILWAY.md](RAILWAY.md))
is far simpler** and keeps your photos too. Only choose Oracle if "free" matters
more than "easy".

Everything the server runs — the shop, the database, and automatic HTTPS — is in
`deploy/oracle/`. All your data lives on disk and survives restarts and updates.

---

## 1. Create the server

1. Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/). Pick a
   **Home Region** close to you (the UK → London or Frankfurt). You cannot change
   it later.
2. **Compute → Instances → Create instance.**
   - **Image**: Canonical **Ubuntu 22.04**.
   - **Shape**: click *Change shape* → **Ampere (Arm)** → **VM.Standard.A1.Flex**,
     and set **2 OCPU, 12 GB** (all within Always Free). This is "Always Free
     eligible". If you get an **"out of capacity"** error, try again later or
     pick a different availability domain — Arm capacity is popular.
   - **SSH keys**: choose *Generate a key pair for me* and **download the private
     key** (keep it safe — it's how you log in). On a computer you can instead
     *Paste public keys* if you already have one.
   - Create the instance and note its **public IP address**.

## 2. Open the firewall (two places — this is the usual stumbling block)

Oracle blocks web traffic by default in **two** layers. Open both.

**a) The cloud firewall (Security List):** Instance → its **VCN** →
**Security Lists → Default Security List → Add Ingress Rules.** Add two rules:
- Source `0.0.0.0/0`, IP Protocol **TCP**, Destination port **80**
- Source `0.0.0.0/0`, IP Protocol **TCP**, Destination port **443**

**b) The server's own firewall:** once you're logged in (step 4), run:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 3. Point your domain at the server

At your domain registrar, add a **DNS A record** for your domain (e.g.
`shop.yourname.co.uk`) pointing to the server's **public IP**. DNS can take a few
minutes to an hour to take effect.

## 4. Log in and install Docker

From your computer's terminal (or SSH app), using the key you downloaded:

```bash
ssh -i /path/to/your-key.key ubuntu@YOUR-SERVER-IP
```

Then install Docker:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Log back in (so the group change takes effect), then `docker --version` should work.

## 5. Get the shop onto the server

Clone the repository (replace with your repo; if it's private, use a
[GitHub token](https://github.com/settings/tokens) as the password):

```bash
git clone https://github.com/ismahiladeoye-ship-it/prediction-market.git
cd prediction-market/scrollme/deploy/oracle
```

(No Git? Upload the project zip I gave you with an SFTP app, unzip it, and `cd`
into `scrollme/deploy/oracle`.)

## 6. Fill in your settings

```bash
cp .env.example .env
nano .env
```

Fill in, then save (`Ctrl+O`, Enter, `Ctrl+X`):

- `DOMAIN` — your domain from step 3 (no `https://`).
- `MONGO_PASSWORD` — any long random value. Generate one with `openssl rand -hex 24`.
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `MFA_SECRET_KEY` — three **different**
  random values, `openssl rand -hex 32` each. **Keep a copy of `MFA_SECRET_KEY`.**
- `STRIPE_SECRET_KEY` — your Stripe **test** secret key (`sk_test_…`) for now.
- Leave `STRIPE_WEBHOOK_SECRET`, `SMTP_URL` etc. for later steps.

## 7. Start the shop

```bash
docker compose up -d --build
```

The first build takes a few minutes. Caddy automatically fetches a free HTTPS
certificate for your domain (this needs step 2 and step 3 done, and ports 80/443
open). Check it's up:

```bash
curl -s https://YOUR-DOMAIN/api/ready
```

You want `{"status":"ok","db":"connected"}`. If something's wrong, see
Troubleshooting below. The shop itself is at `https://YOUR-DOMAIN`.

## 8. Make yourself the admin and fill in the shop

The database runs on your server, so set the first admin from the command line:

```bash
docker compose exec -e ADMIN_PASSWORD='Your-Strong-Passw0rd!' app \
  node scripts/createAdmin.js --email=you@example.com --first=Your --last=Name
```

Then on the shop, sign in and open **`/admin`** to set up two-step sign-in (save
the ten recovery codes). In the admin, fill in **Shop details** (your business
address and email are required by UK law), upload your **Home page** covers, and
add stock with **Bulk upload**. Photos are kept on the server's `uploads` volume
and persist across updates.

## 9. Payments and email

Same as the other guides:

- **Stripe** ([VERCEL.md §7](VERCEL.md#7-connect-stripe-payments-test-mode-first)):
  add a webhook to `https://YOUR-DOMAIN/api/payments/stripe/webhook`, put its
  signing secret in `.env` as `STRIPE_WEBHOOK_SECRET`, then `docker compose up -d`
  to apply. Test with card `4242 4242 4242 4242`.
- **Email** ([VERCEL.md §8](VERCEL.md#8-turn-on-emails)): set `SMTP_URL`,
  `MAIL_FROM` (and `NOTIFY_EMAIL`) in `.env`, then `docker compose up -d`.
- **Going live**: switch `STRIPE_SECRET_KEY` to the live key, set
  `STRIPE_ALLOW_LIVE=true`, add the live webhook secret, apply, and test with a
  real card you refund. Have the legal pages checked first.

## 10. Updating and backing up

- **Apply new code**: `git pull` then `docker compose up -d --build`.
- **Restart after changing `.env`**: `docker compose up -d`.
- **Back up the database** (customer and order data) regularly:

  ```bash
  docker compose exec mongo sh -c 'mongodump --username gis --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db getitsourced --archive --gzip' > backup-$(date -u +%Y%m%d).archive.gz
  ```

  Copy the file off the server, and keep it somewhere safe (it contains personal
  data). Oracle's free tier has no automatic backups.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `curl` to your domain hangs or "connection refused" | Ports 80/443 not open — recheck step 2 (both the Security List **and** iptables). |
| HTTPS certificate errors / Caddy keeps retrying | DNS isn't pointing at the server yet (step 3), or port 80 is closed. `docker compose logs caddy` shows the reason. |
| `{"status":"...","db":"disconnected"}` | `docker compose logs mongo` and `... app`; usually the `MONGO_PASSWORD` differs between the two (it must match in `.env`). |
| Sign-in or checkout says "cross-site request blocked" | `DOMAIN` in `.env` must be exactly your address; then `docker compose up -d`. |
| The Arm shape won't create ("out of capacity") | Try later, a different availability domain, or the AMD **VM.Standard.E2.1.Micro** shape (also Always Free, but only 1 GB RAM — building may be slow; build elsewhere or use Railway). |
| See what's happening | `docker compose ps` and `docker compose logs -f app`. |

## How it runs (for reference)

- One container serves the storefront and API (`SERVE_STATIC`); `mongo` holds the
  data; `caddy` provides HTTPS. All three keep their data on named Docker volumes.
- The always-on server releases stock from abandoned checkouts every minute; no
  cron job is needed.
- Photos live on the `uploads` volume. (On a host **without** a lasting disk you'd
  set the `R2_*` variables to use Cloudflare R2 instead — not needed here.)
- Security headers, shared rate limits and everything else are exactly as on the
  other hosts.
