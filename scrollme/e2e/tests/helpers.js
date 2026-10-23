const path = require('node:path');
const { expect } = require('@playwright/test');

const OTPAuth = require(path.resolve(__dirname, '../../backend/node_modules/otpauth'));

// Must match DEV_ADMIN_MFA_SECRET in backend/scripts/users/seedUsers.js.
const DEV_ADMIN_MFA_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

const SEEDED = { username: 'johndoe', password: 'password123' };
const ADMIN = { username: 'mjohnson', password: 'password123', mfaSecret: DEV_ADMIN_MFA_SECRET };
// Created by stack.js: an admin who has not set up two-factor yet.
const NEW_ADMIN = { username: 'e2enewadmin', password: 'Passw0rd!e2e' };

const totpCode = (secret, offsetSteps = 0) =>
  new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) }).generate({ timestamp: Date.now() + offsetSteps * 30000 });

// Each code works once, so try the current and the next one, and if both
// were used by earlier sign-ins, wait for the next 30-second window.
const submitTotp = async (secret, submit) => {
  for (let round = 0; round < 3; round += 1) {
    for (const offset of [0, 1]) {
      if (await submit(totpCode(secret, offset))) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 30000 - (Date.now() % 30000) + 250));
  }
  throw new Error('No two-factor code was accepted');
};

const login = async (page, { username, password, mfaSecret } = SEEDED) => {
  await page.goto('/login');
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
  if (mfaSecret) {
    const field = page.getByLabel('Authentication code');
    await expect(field).toBeVisible();
    await submitTotp(mfaSecret, async (code) => {
      await field.fill(code);
      await page.getByRole('button', { name: 'VERIFY' }).click();
      return page
        .waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 4000 })
        .then(
          () => true,
          () => false
        );
    });
  }
  await expect(page).not.toHaveURL(/\/login$/);
};

// Signs an API request context in as the demo admin (password + code).
const apiLoginAdmin = async (request) => {
  const res = await request.post('/api/auth/login', { data: { username: ADMIN.username, password: ADMIN.password } });
  expect((await res.json()).mfaRequired).toBe(true);
  await submitTotp(ADMIN.mfaSecret, async (code) => (await request.post('/api/auth/mfa/verify', { data: { code } })).ok());
};

// Sizes are buttons with role="radio" on the product page.
const chooseSize = async (page, size) => {
  await page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name: size, exact: true }).click();
};

// An in-stock product from the seeded catalogue, via the public API.
const findProduct = async (request, query = 'inStock=true&sort=rating') => {
  const res = await request.get(`/api/product/list?limit=1&${query}`);
  const { products } = await res.json();
  return products[0];
};

const fillAddress = async (page) => {
  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Phone').fill('+44 7366 982207');
  await page.getByLabel('Address line 1').fill('16 Benton Street');
  await page.getByLabel('City').fill('Manchester');
  await page.getByLabel('Postcode').fill('m9 4ng');
  await expect(page.getByLabel('Country')).toHaveValue('United Kingdom');
};

// Adds a product through the admin API (the request context signs in as the admin).
const createProduct = async (request, fields) => {
  await apiLoginAdmin(request);
  const res = await request.post('/api/admin/products', { data: { category: 'tshirts', stock: 20, sizes: [], ...fields } });
  expect(res.status()).toBe(201);
  return (await res.json()).product;
};

// Matches the storefront's price format, e.g. £1,699.00.
const money = (n) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

module.exports = { SEEDED, ADMIN, NEW_ADMIN, login, totpCode, chooseSize, findProduct, createProduct, fillAddress, money };
