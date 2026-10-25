# ScrollMe — Phase 1 audit of the original source

Source audited: `SCROLLME--ECOMMERCE-WEBSITE-master.zip`, imported **unmodified** into
`scrollme/` in commit `79b736e` so every later change can be diffed against the original.
All observations below were taken on that commit, on Node 22.22 / npm 10.9, with a real
MongoDB 7 instance (mongodb-memory-server) seeded with the project's own seed script.

## 1. Inventory

| Area | What exists |
| --- | --- |
| Frontend | Create React App 5 (`react-scripts`), React 18, React Router 6, Redux Toolkit + redux-persist, styled-components 5, Chakra UI 2, MUI icons, Firebase 10 (Google sign-in / password reset), axios |
| Backend | Express 4, Mongoose 8, JWT in httpOnly cookies, bcrypt, zod (register only), helmet, cors, cookie-parser |
| Database | MongoDB `scrollme`: `products` (24,324 seeded), `users` (10 seeded), `carts`, `usertokens` |
| Tests | Frontend: CRA default `App.test.js`. Backend: `__tests__/auth.test.js`, `testEnv.test.js` |
| Tooling | ESLint (flat config) + Prettier + Husky pre-commit; a `pr-check.yml` workflow; Dockerfiles + `docker-compose.yml` |

### Frontend routes (`src/App.js`)

| Route | Page | State in original |
| --- | --- | --- |
| `/` | Home: Announcement, Navbar, Slider, Categories, Products, FAQ, Newsletter, Footer | Renders; product tiles fetch first 10 products |
| `/products` | AllProducts → ProductGallery | Works: pagination (Prev/Next) over `/api/product/list` only |
| `/:categorySlug` | CategoryProducts | **Stub** — prints `Category: <slug>` |
| `/:categorySlug/:productId` | Product detail | Works for data; colour/size pickers are hard-coded and do nothing |
| `/cart` (protected) | Cart | Shows Redux-local items only, never loads the server cart; summary maths wrong |
| `/wishlist` (protected) | Wishlist | localStorage only (not per user) |
| `/login`, `/register`, `/forgot-password` | Auth pages | Login/registration work; Google sign-in and reset do not integrate with the backend (see §4) |
| `/contact-us`, `/comingsoon`, `/contributors` | Static / GitHub API | Contact form only `alert()`s |
| `*` | `<h1>404 Not Found</h1>` | |

### Backend routes (`backend/server.js`)

| Mount | Endpoints | State |
| --- | --- | --- |
| `/api/auth` | `POST register`, `POST login`, `POST logout`, `POST refresh-token`, `GET status` | register/login/status work; **refresh always fails** |
| `/api/product` | `GET list`, `GET /:id`, `POST add`, `PUT update/:id`, `DELETE delete/:id` | list/get work; **writes open to any logged-in user** |
| `/api/cart` | `POST add`, `GET view`, `PUT update`, `DELETE delete`, `DELETE clear` | work, but **trust client-supplied price** |
| `/api/user` | `register`, `sign_in`, `user_profile`, `logout` | Legacy duplicate of `/api/auth`; broken (see §4) |

## 2. Visual identity (to be preserved in Phase 2)

| Token | Original value | Where |
| --- | --- | --- |
| Typeface | **Urbanist** (Google Fonts, weights 100–900), applied with `* { font-family: 'Urbanist' }` in `public/index.html` | everywhere |
| Primary accent | CSS `teal` (#008080) | announcement bar, `ME` in logo, buttons, icons, links |
| Wordmark | `SCROLL` + teal `ME`, `h1` 2rem (3rem in footer) | `components/Logo.jsx` |
| Hero slide backgrounds | `#f5fafd`, `#fcf1ed`, `#fbf0f4` | `data.js` |
| Product tile | `#f5fbfd` tile with white 200px circle | `components/Product.jsx` |
| Newsletter | `#fcf5f5` | `components/Newsletter.jsx` |
| Footer contact (mobile) | `#fff8f8` | `components/Footer.jsx` |
| Arrow buttons | `#fff7f7` | `components/Slider.jsx` |
| Light weights | Large prices/titles use weight 200–300 | Product, Cart, Auth pages |
| CSS base | Tailwind 2.2.19 preflight (CDN stylesheet) **and** the Tailwind Play CDN script; Chakra CSS reset | `public/index.html`, `index.js` |
| Assets | `public/Images/slide1-3.png`; category photos from Pexels; payment strip from i.ibb.co; product images hot-linked from `assets.myntassets.com` | |

Breakpoints (`src/responsive.js`): `mobile` ≤ 768px (the 380px block repeats the same rules),
`tablet` ≤ 1200px, `desktop` ≤ 1920px (applies to almost every screen).

Baseline screenshots of the original build are in [`baseline-screenshots/`](baseline-screenshots/).

## 3. Baseline build and test results (original code, unmodified)

| Check | Command | Result |
| --- | --- | --- |
| Frontend install | `npm ci` | ✅ 1,920 packages |
| Frontend build | `CI=true react-scripts build` | ✅ compiles; main bundle **649 kB gzip** (warning) |
| Frontend tests | `react-scripts test --watchAll=false` | ❌ suite fails to run — Jest cannot resolve a Chakra UI ESM dependency; the only test also asserts the CRA placeholder text "learn react" |
| Frontend lint | `npm run lint` | ⚠️ "passes", but the unquoted glob `src/**/*[js,mjs,cjs,jsx]` is shell-expanded and lints only part of `src` |
| Backend install | `npm ci` | ✅ 748 packages |
| Backend tests | `jest` | ❌ 2/2 suites fail: tests need a running MongoDB and `process.exit(1)` on connect failure; `testEnv` hard-codes `JWT_SECRET === 'someone'` |
| Backend lint | `eslint .` | ❌ crashes: `'plugin:prettier/recommended'` string is not valid in a flat config |
| Backend start without `.env` | `node server.js` | ❌ prints "Server running" **then** exits: `MONGODB_URI` undefined |
| Backend start with `.env` + MongoDB | `node server.js` | ✅ |
| Seed | `npm run seed` | ✅ 24,324 products + 10 users (URI hard-coded to `127.0.0.1:27017`, ignores `.env`) |
| Docker | `docker-compose.yml` | ❌ references `./frontend`, which does not exist; backend image copies host `node_modules` |
| CI | `.github/workflows/pr-check.yml` | ❌ inactive (not at repo root) and calls scripts that do not exist (`coverage`, `size`, `e2e`), Node 16 |

### Live API smoke test (original backend + seeded MongoDB)

| Probe | Observed | Verdict |
| --- | --- | --- |
| `GET /api/product/list?limit=2` | 200, paginated | ✅ |
| `POST /api/auth/register` | 201, httpOnly cookies | ✅ |
| `POST /api/auth/login` (seeded `johndoe`) | 200 | ✅ |
| `GET /api/auth/status` | 200 Authenticated | ✅ |
| `POST /api/cart/add` with `"price": 0.01` | **200 — cart stores 0.01** | ❌ client controls price |
| `POST /api/product/add` as an ordinary user | **201 — product created** | ❌ no admin check |
| `GET /api/product/notanid` | 500 | ❌ should be 404/400 |
| `POST /api/auth/refresh-token` | 401 always | ❌ token signed with `JWT_SECRET`, verified with `REFRESH_TOKEN_SECRET`; controller reads token from body |
| `POST /api/user/register` then `/api/user/sign_in` | registered, then **login fails** | ❌ password hashed twice (controller + model hook) |
| Security headers | helmet defaults present | ✅ (CSP never applied to the SPA, which is served separately) |

## 4. Defects found

Severity: **C** critical (security/money), **H** high (feature broken), **M** medium, **L** low.

### Backend
1. **C** Cart accepts `price` from the client and stores it; totals derive from it.
2. **C** Product add/update/delete only require login, not the `admin` role. `roles` exists on users but is never checked. `addProduct`/`updateProduct` pass `req.body` straight to Mongoose (mass assignment).
3. **C** Committed default secrets: `JWT_SECRET=someone`; legacy controllers hard-code `'SCROLLME_SECRET'`. No check that secrets are set.
4. **H** Refresh flow broken (see table). Access token lifetime 1h, refresh 30d, refresh signed with the *access* secret, no revocation on logout.
5. **H** `/api/user/*` legacy routes: double-hashed passwords, `verifyAccessToken` references an undefined variable, `profile` treats a middleware as a promise. Unused by the frontend.
6. **H** No order model, checkout, payment, or inventory decrement. `orders.json` is unrelated dummyjson sample data.
7. **H** Seed generator stores the **brand** in `category` (e.g. `"category": "greenfibre"`), replaces real sizes (`S,M,L`) with random numbers, randomises `isActive`, and stores `tags` as a comma string while the schema requires an array (raw driver insert bypasses validation). Real categories (278, e.g. `tshirts`, `dresses`) exist in `products.json` as `product_tag`.
8. **M** Product list has no search, filter, sort, or limit cap (`?limit=1000000` accepted). Inactive products are listed.
9. **M** Invalid ObjectIds return 500; errors leak `error.message`.
10. **M** Registration password rule says "12 characters" but enforces 6; no email format check; no rate limiting (limiter commented out); CORS origin hard-coded to `http://localhost:3000`.
11. **M** `dbConnect` exits the process on failure, which kills Jest; server listens before DB is ready; no health endpoint; no graceful shutdown.
12. **L** `cartRoute` applies `authMiddleware` up to three times; `body-parser` used without being a declared dependency; `"backend": "file:"` and `"save"` are junk self-dependencies; `CartItem` model unused.

### Frontend
13. **H** Cart is never loaded from the server: `viewCartAPI`/`clearCartAPI` omit `withCredentials`; the reducer expects `totalQuantity`/`totalPrice` the API never returns. The cart badge reflects only this browser's localStorage.
14. **H** Order summary: tax `$30` and delivery `$20` are hard-coded text and **excluded** from the displayed total. "CHECKOUT NOW" buttons do nothing.
15. **H** Logout: `UserSingOutAPI` passes the axios config as the request *body*, so cookies are not sent and the server session survives; Redux is cleared anyway.
16. **H** Google sign-in sets `isAuthenticated = true` in Redux without any backend session (every protected API call then 401s). Forgot-password sends a Firebase reset email for an account system the backend does not use.
17. **H** Navbar search input is not wired. `/:categorySlug` is a stub. Category tiles link to the literal path `/item.title`. Footer category links go to `/comingsoon`.
18. **M** Home product tile: wishlist check compares `item._id === item?._id` (shadowed variable → always true when the wishlist is non-empty). Clicking the cart icon navigates to `/cart` before the add completes. "Search" icon navigates to `/product/:id` (works only by accident through the category route).
19. **M** Product detail: colour swatches and sizes are hard-coded; "BUY NOW" does nothing; `product.title` (undefined) used as image alt; spinner page has no navbar; 55px horizontal overflow on 375px phones.
20. **M** `ProductCard` crashes if `description` or `ratings` is missing; no image fallback; empty result and error states only on the gallery.
21. **M** Wishlist persisted in localStorage per browser, not per account; survives logout and leaks to the next user of the device.
22. **M** API base URL hard-coded to `http://localhost:8080/api` in two places; Firebase config hard-coded.
23. **M** `useAuthCheck` polls every 2 minutes and contains dead logic (`isAuthenticated` local is always false).
24. **L** `index.html` loads Tailwind twice (2.2.19 stylesheet + Play CDN script, which is not for production). Only the contributors page uses Tailwind classes.
25. **L** Newsletter and contact forms only call `alert()`.

### Responsive (from baseline screenshots)
26. Product detail overflows phones (two fixed 200px buttons + 80% container).
27. Mobile hero: "SHOP NOW" is absolutely positioned at the top-right of the slide, away from its copy.
28. Navbar mobile search input rule is malformed CSS (`margin: 'auto' @media…`).
29. Lazy-loaded tiles (home products, third category image on phones) stay blank until scrolled into view — expected lazy behaviour, but there is no image-error fallback.

## 5. What works and must be kept
- Visual design and copy listed in §2; page composition of Home, Product, Cart, Wishlist, auth pages.
- Cookie-based JWT auth model (httpOnly, SameSite) and the register/login/status endpoints.
- Product gallery pagination and the product detail layout (image modal, ratings stars, details table).
- Redux Toolkit store layout (`user`, `cart`, `wishlist` slices) and service-module pattern (`src/services/*`).
- The 24k-product dataset (with the category/size mapping corrected from the raw `products.json`).
