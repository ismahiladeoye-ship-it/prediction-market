const { test, expect } = require('@playwright/test');
const { findProduct } = require('./helpers');

test.describe('catalogue', () => {
  test('home page shows the store sections and real products @phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('FREE UK DELIVERY ON ORDERS OVER £100')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Footwear, sourced' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shop by collection' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top rated' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Footwear/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Add .* to wishlist/ }).first()).toBeAttached();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('navbar search lists matching products and filters/sorting update the URL', async ({ page, request }) => {
    const product = await findProduct(request);
    const word = product.name.split(' ').find((w) => w.length > 3);
    await page.goto('/');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByLabel('Search products').fill(word);
    await page.getByLabel('Search products').press('Enter');
    await expect(page).toHaveURL(new RegExp(`/products\\?q=${word}`));
    await expect(page.getByRole('heading', { name: `Results for “${word}”` })).toBeVisible();
    await expect(page.getByText(/\d+ products?/)).toBeVisible();

    await page.getByLabel('Sort products').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page.getByText(/^£\d/).first()).toBeVisible();
    const prices = await page.getByText(/^£\d/).allTextContents();
    const values = prices.map((t) => Number(t.replace(/[^\d.]/g, '')));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  test('shows an empty state for searches without results', async ({ page }) => {
    await page.goto('/products?q=no-such-product-xyz');
    await expect(page.getByText('No products found')).toBeVisible();
  });

  test('collection carousels and the Shop menu open collection pages', async ({ page }) => {
    await page.goto('/');
    const clothing = page.getByRole('region', { name: 'Clothing', exact: true });
    await clothing.getByRole('button', { name: 'Next: Clothing' }).click();
    await clothing.getByRole('link', { name: /^Jackets, [\d,]+ items$/ }).click();
    await expect(page).toHaveURL(/\/collections\/clothing\?category=jackets$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Clothing' })).toBeVisible();

    await page.goto('/');
    await page.getByRole('link', { name: /^Footwear, [\d,]+ items$/ }).click();
    await expect(page).toHaveURL(/\/collections\/footwear$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Footwear' })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('button', { name: 'Shop' }).click();
    await nav.getByRole('link', { name: 'Fragrances' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Fragrances' })).toBeVisible();
    await page.goto('/collections/not-a-collection');
    await expect(page.getByText('This collection does not exist')).toBeVisible();
  });

  test('phone menu lists the collections @phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The hamburger menu only exists on phones');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    for (const name of ['Home', 'Contact', 'About us', 'Clothing', 'Footwear', 'Accessories', 'Fragrances', 'Login']) {
      await expect(menu.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await menu.getByRole('link', { name: 'Footwear', exact: true }).click();
    await expect(page).toHaveURL(/\/collections\/footwear$/);
  });

  test('product page shows real sizes and colour, and 404s cleanly', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&category=tshirts');
    await page.goto(`/${product.category}/${product._id}`);
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
    if (product.sizes.length) {
      const sizes = await page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio').allTextContents();
      expect(sizes).toEqual(product.sizes);
    }
    await page.goto('/tshirts/507f1f77bcf86cd799439011');
    await expect(page.getByText('Product not found')).toBeVisible();
  });
});
