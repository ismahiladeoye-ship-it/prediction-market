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
  await page.getByLabel('Postal code').fill('M9 4NG');
  await page.getByLabel('Country').selectOption('GB');
};

module.exports = { SEEDED, ADMIN, login, chooseSize, findProduct, fillAddress };
