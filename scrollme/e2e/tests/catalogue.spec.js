const { test, expect } = require('@playwright/test');
const { findProduct } = require('./helpers');

test.describe('catalogue', () => {
  test('home page shows the store sections and real products @phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('FREE UK DELIVERY ON ORDERS OVER £100')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Footwear, sourced' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shop by category' })).toBeVisible();
    for (const name of ["Men's Clothing", "Women's Clothing", "Men's Shoes & Boots", "Women's Shoes & Boots"]) {
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /^Men's Shoes & Boots/ }).first()).toBeVisible();
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

  test('category slider, shortcut buttons and the Men/Women/Electronics menus open department pages', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('region', { name: 'Categories', exact: true });
    await slider.getByRole('button', { name: 'Next: Categories' }).click();
    await slider.getByRole('link', { name: /^Women's Shoes & Boots, [\d,]+ items$/ }).click();
    await expect(page).toHaveURL(/\/women\/shoes-boots$/);
    await expect(page.getByRole('heading', { level: 1, name: "Women's Shoes & Boots" })).toBeVisible();

    await page.goto('/');
    await page.getByRole('navigation', { name: "Men's Clothing categories", exact: true }).getByRole('link', { name: 'T-shirts' }).click();
    await expect(page).toHaveURL(/\/men\/clothing\/t-shirts$/);
    await expect(page.getByRole('heading', { level: 1, name: 'T-shirts' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Men');

    // Shoes & Boots buttons are brand searches within the category.
    await page.goto('/');
    await page
      .getByRole('navigation', { name: "Men's Shoes & Boots categories", exact: true })
      .getByRole('link', { name: 'UGG Tasman' })
      .click();
    await expect(page).toHaveURL(/\/men\/shoes-boots\?q=ugg%20tasman$/);
    await expect(page.getByRole('heading', { level: 1, name: "Men's Shoes & Boots" })).toBeVisible();

    await page.goto('/');
    await page.getByRole('link', { name: "View all Women's Clothing" }).click();
    await expect(page).toHaveURL(/\/women\/clothing$/);

    // Desktop menu: Women opens every category with its subcategories.
    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('button', { name: 'Women' }).click();
    const panel = page.getByRole('region', { name: 'Women categories', exact: true });
    await expect(panel.getByRole('link', { name: 'Knee-high boots' })).toBeVisible();
    await panel.getByRole('link', { name: 'Dresses', exact: true }).click();
    await expect(page).toHaveURL(/\/women\/dresses$/);
    await expect(page.getByRole('heading', { level: 1, name: "Women's Dresses" })).toBeVisible();
    await page
      .getByRole('navigation', { name: "Women's Dresses categories", exact: true })
      .getByRole('link', { name: 'Midi dresses' })
      .click();
    await expect(page).toHaveURL(/\/women\/dresses\/midi-dresses$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Midi dresses' })).toBeVisible();

    // Electronics is its own section.
    await nav.getByRole('button', { name: 'Electronics' }).click();
    await page
      .getByRole('region', { name: 'Electronics categories', exact: true })
      .getByRole('link', { name: 'Gaming', exact: true })
      .click();
    await expect(page).toHaveURL(/\/electronics\/gaming$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Gaming' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Gaming categories', exact: true }).getByRole('link', { name: 'Consoles' })
    ).toBeVisible();

    await page.goto('/women/not-a-category');
    await expect(page.getByText('This category does not exist')).toBeVisible();
    // Links from before Men and Women still land on the shop.
    await page.goto('/collections/footwear');
    await expect(page).toHaveURL(/\/products$/);
  });

  test('phone menu opens Men and Women categories and their subcategories @phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The hamburger menu only exists on phones');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    for (const name of ['Home', 'Contact', 'About us', 'Login', 'Shop all Men']) {
      await expect(menu.getByRole('link', { name, exact: true })).toBeVisible();
    }
    await menu.getByRole('button', { name: 'Shoes & Boots' }).click();
    await expect(menu.getByRole('link', { name: 'Shop all Shoes & Boots' })).toBeVisible();
    await menu.getByRole('link', { name: 'Trainers', exact: true }).click();
    await expect(page).toHaveURL(/\/men\/shoes-boots\/trainers$/);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await menu.getByRole('button', { name: 'Women', exact: true }).click();
    await menu.getByRole('button', { name: 'Dresses' }).click();
    await menu.getByRole('link', { name: 'Maxi dresses' }).click();
    await expect(page).toHaveURL(/\/women\/dresses\/maxi-dresses$/);
  });

  test('product page shows real sizes and colour, and 404s cleanly', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&category=clothing&subcategory=t-shirts');
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
