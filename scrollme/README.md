# Get It Sourced

**Get It Sourced** is an online store for sourced fashion, footwear and accessories. It is built on the open-source **ScrollMe** eCommerce project (MIT licence) with **React**, **Styled Components**, **Node.js (Express)** and **MongoDB**. This version restores the original ScrollMe storefront design under the Get It Sourced name and completes it into a working shop: real catalogue, accounts, server-priced cart, checkout with a secure payment-method sheet, orders, and store administration.

| | |
| --- | --- |
| Audit of the original code | [docs/audit/AUDIT.md](docs/audit/AUDIT.md) |
| Security audit (Oct 2026) | [docs/security/SECURITY_AUDIT.md](docs/security/SECURITY_AUDIT.md) |
| Release-candidate report (what was fixed and how it was verified) | [docs/RELEASE_CANDIDATE.md](docs/RELEASE_CANDIDATE.md) |
| Deployment guide | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Operations runbook (logs, health, backups, restore) | [docs/OPERATIONS.md](docs/OPERATIONS.md) |
| API reference | [backend/README.md](backend/README.md) |
| Adding products in bulk (spreadsheet + photos) | [docs/BULK_UPLOAD.md](docs/BULK_UPLOAD.md) |
| Screenshots | [docs/screenshots/](docs/screenshots/) |

## Features

- [x] **Streetwear storefront design**: monochrome black-and-white look, condensed display headings, rotating announcement bar, hero carousel, shop-by-collection, phone menu drawer, scrolling-brand footer with newsletter sign-up; responsive on phones, tablets and desktops. Edit text, images and links in `src/data.js` (`storeConfig`) and colours/fonts in `src/styles/global.css`.
- [x] **Catalogue**: 24k products in 278 real categories grouped into Clothing, Footwear, Accessories and Fragrances collections; search, collection and category pages, price/stock filters, sorting, pagination.
- [x] **Accounts**: registration, login, logout, refresh tokens in httpOnly cookies, password reset, optional Google sign-in.
- [x] **Wishlist**: saved per account (guest wishlists are merged on sign-in).
- [x] **Cart**: sizes, stock checks; prices, tax and delivery always computed on the server.
- [x] **Checkout**: delivery address and method, then a *Secure Payment* sheet — Apple Pay, card, PayPal, Klarna, Google Pay — paid through **Stripe Checkout in test mode**.
- [x] **Orders**: confirmation, history, status tracking, cancellation of unpaid orders; stock reserved at checkout and released if payment is abandoned.
- [x] **Administration**: **two-factor sign-in for admins** (authenticator app + one-time recovery codes), dashboard, product management (create/edit/hide, stock, photo uploads), **bulk upload from a spreadsheet with photos** (preview, update by SKU), order fulfilment with status lifecycle and tracking numbers.
- [ ] Email notifications for orders, reviews, discounts, multi-language — not in scope yet.

## Project layout

```
scrollme/
├── src/              React storefront (Create React App)
├── public/           Static assets (original slider images)
├── backend/          Express + Mongoose API
├── e2e/              Playwright end-to-end tests
├── deploy/nginx/     nginx config for the storefront image
├── scripts/          backup.sh / restore.sh
├── docs/             Audit, release report, deployment and operations guides
├── Dockerfile        Storefront image (build + nginx)
└── docker-compose.yml  MongoDB + API + storefront
```

## Local development

Requirements: Node.js 22+ (24 LTS recommended; Docker and CI use 24), and MongoDB 7 (local install, Docker, or Atlas).

```bash
# 1. API
cd backend
cp .env.example .env          # PAYMENT_PROVIDER=mock works without Stripe keys
npm install
npm run seed                  # 24,324 products + demo users (development only)
npm run dev                   # http://localhost:8080

# 2. Storefront (new terminal, from scrollme/)
npm install
npm start                     # http://localhost:3000 (proxies /api to :8080)
```

Demo accounts created by the seed (development only): `johndoe` / `password123` (customer) and `mjohnson` / `password123` (admin). The demo admin has two-factor sign-in on: after the password, enter the code printed by `cd backend && npm run dev-admin-code` (or add the demo key `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP` to an authenticator app). Create real administrators with `npm run create-admin`; they set up two-factor on their first visit to the admin pages (see [backend/README.md](backend/README.md#administrators)).

With `PAYMENT_PROVIDER=mock` the payment step opens a local **test-mode** page for the chosen method (card form, Apple Pay, Google Pay, PayPal, Klarna). Card test numbers: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined. To use real Stripe test mode, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#payments-stripe-test-mode).

## Tests

| Suite | Command | What it covers |
| --- | --- | --- |
| API | `cd backend && npm test` | 121 tests on a real MongoDB: auth, admin two-factor sign-in, permissions, catalogue and collections, photo uploads, bulk import, cart pricing, UK delivery, checkout, stock, payments/webhooks, admin, wishlist, newsletter, HTTP hardening |
| Storefront unit | `npm run test:ci` | 24 tests: route guards, payment sheet, gallery states, cart/wishlist state, validation |
| End-to-end | `npm run build && cd e2e && npm install && npx playwright test` | 21 browser tests (desktop + phone) against the real API, database and production build |
| Lint/format | `npm run lint && npm run lint-check`, `cd backend && npm run lint` | |

CI runs all of the above plus Docker image builds: [.github/workflows/scrollme.yml](../.github/workflows/scrollme.yml).

## Contributing

We welcome contributions from the community! To contribute to ScrollMe, follow these steps:

1. **Fork the repository** on GitHub.
2. **Checkout the `develop` branch**

```bash
   git checkout develop
```

3. **Install dependencies**
   Run the following command to install project dependencies:

 ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
```

4. **Create a branch** for your feature or bugfix

   ```bash
   git checkout -b feature-name
   ```

5. **Commit your changes**

   ```bash
   git commit -m "Add feature-name"
   ```

6. **Push to your fork**

   ```bash
   git push origin feature-name
   ```

7. **Open a pull request**: Provide a detailed description of your changes in the pull request template. Link to any relevant issues.

### Guidelines

- Ensure code quality by following consistent formatting and naming conventions.
- Write clear and concise commit messages.
- Test your changes thoroughly before submitting a pull request.

## Code of Conduct

We are committed to fostering a welcoming and harassment-free community. All participants are expected to adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please treat others with respect and professionalism in all interactions.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

We appreciate your interest in ScrollMe and look forward to your contributions!

## Community Discussion

Join our Discord Server for community discussions, support, and collaboration!

We appreciate your interest in ScrollMe and look forward to your contributions!

Just replace https://discord.gg/w4nKprr5 with the actual link to your Discord server. Let me know if you need any further modifications!
