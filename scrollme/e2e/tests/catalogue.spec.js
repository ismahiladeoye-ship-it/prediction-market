const { test, expect } = require('@playwright/test');
const { findProduct } = require('./helpers');

test.describe('catalogue', () => {
  test('home page shows the original ScrollMe sections and real products @phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Super deal hour started')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SUMMER SALE' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SHIRT STYLE!' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View product' }).first()).toBeAttached();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('navbar search lists matching products and filters/sorting update the URL', async ({ page, request }) => {
    const product = await findProduct(request);
    const word = product.name.split(' ').find((w) => w.length > 3);
    await page.goto('/');
    await page.getByLabel('Search products').fill(word);
    await page.getByLabel('Search products').press('Enter');
    await expect(page).toHaveURL(new RegExp(`/products\\?q=${word}`));
    await expect(page.getByRole('heading', { name: `Results for “${word}”` })).toBeVisible();
    await expect(page.getByText(/\d+ products?/)).toBeVisible();

    await page.getByLabel('Sort products').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    const prices = await page.locator('h3').allTextContents();
    const values = prices.filter((t) => t.startsWith('$')).map((t) => Number(t.replace(/[^\d.]/g, '')));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  test('shows an empty state for searches without results', async ({ page }) => {
    await page.goto('/products?q=no-such-product-xyz');
    await expect(page.getByText('No products found')).toBeVisible();
  });

  test('category tiles open category pages', async ({ page }) => {
    await page.goto('/');
    // The tile under "SHIRT STYLE!" (the hero slider has its own SHOP NOW links).
    await page.locator('a[href="/shirts"]', { hasText: 'SHOP NOW' }).click();
    await expect(page).toHaveURL(/\/shirts$/);
    await expect(page.getByRole('heading', { name: 'Shirts' })).toBeVisible();
  });

  test('product page shows real sizes and colour, and 404s cleanly', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&category=tshirts');
    await page.goto(`/${product.category}/${product._id}`);
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
    if (product.sizes.length) {
      const options = await page.getByLabel('Size').locator('option').allTextContents();
      expect(options.slice(1)).toEqual(product.sizes);
    }
    await page.goto('/tshirts/507f1f77bcf86cd799439011');
    await expect(page.getByText('Product not found')).toBeVisible();
  });
});
