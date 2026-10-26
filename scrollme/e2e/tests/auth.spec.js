const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('accounts', () => {
  test('registers, stays signed in after reload, and logs out', async ({ page }) => {
    const id = Date.now();
    await page.goto('/register');
    await page.getByLabel('First name').fill('Grace');
    await page.getByLabel('Last name').fill('Hopper');
    await page.getByLabel('Username').fill(`grace${id}`);
    await page.getByLabel('Email').fill(`grace${id}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('Str0ng!Passw0rd');
    await page.getByLabel('Confirm password').fill('Str0ng!Passw0rd');
    await page.getByRole('button', { name: 'CREATE' }).click();
    await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
    // The server session is gone too: a protected page sends us to sign in.
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('rejects a weak password before submitting', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('First name').fill('Weak');
    await page.getByLabel('Last name').fill('Password');
    await page.getByLabel('Username').fill('weakpw');
    await page.getByLabel('Email').fill('weak@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password');
    await page.getByLabel('Confirm password').fill('password');
    await page.getByRole('button', { name: 'CREATE' }).click();
    await expect(page.getByText('Invalid Password')).toBeVisible();
  });

  test('explains a rejected sign-up under the form and accepts phone apostrophes', async ({ page }) => {
    const id = Date.now();
    await page.goto('/register');
    await page.getByLabel('First name').fill('Shaq');
    await page.getByLabel('Last name').fill('O’Neal');
    await page.getByLabel('Username').fill(`shaq${id}@example.com`);
    await page.getByLabel('Email').fill(`shaq${id}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('Str0ng!Passw0rd');
    await page.getByLabel('Confirm password').fill('Str0ng!Passw0rd');
    await page.getByRole('button', { name: 'CREATE' }).click();
    // The reason stays on the page after the pop-up closes.
    await expect(page.locator('form [role=alert]')).toContainText('not your email address');

    await page.getByLabel('Username').fill(`shaq${id}`);
    await page.getByRole('button', { name: 'CREATE' }).click();
    await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible();
  });

  test('shows an error for wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username or email').fill('johndoe');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid username or password' })).toBeVisible();
  });

  test('returns to the requested page after signing in', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Username or email').fill('johndoe');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await expect(page).toHaveURL(/\/wishlist$/);
  });

  test('guest wishlist is merged into the account on sign-in', async ({ page, request }) => {
    const res = await request.get('/api/product/list?limit=1&sort=price_desc');
    const product = (await res.json()).products[0];
    await page.goto(`/${product.category}/${product._id}`);
    await page.getByRole('button', { name: 'Add to wishlist' }).click();
    await login(page);
    await page.goto('/wishlist');
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
  });
});
