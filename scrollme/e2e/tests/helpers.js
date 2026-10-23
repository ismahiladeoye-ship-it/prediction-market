const { expect } = require('@playwright/test');

const SEEDED = { username: 'johndoe', password: 'password123' };
const ADMIN = { username: 'mjohnson', password: 'password123' };

const login = async (page, { username, password } = SEEDED) => {
  await page.goto('/login');
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
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
  expect((await request.post('/api/auth/login', { data: ADMIN })).ok()).toBeTruthy();
  const res = await request.post('/api/admin/products', { data: { category: 'tshirts', stock: 20, sizes: [], ...fields } });
  expect(res.status()).toBe(201);
  return (await res.json()).product;
};

// Matches the storefront's price format, e.g. £1,699.00.
const money = (n) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

module.exports = { SEEDED, ADMIN, login, chooseSize, findProduct, createProduct, fillAddress, money };
