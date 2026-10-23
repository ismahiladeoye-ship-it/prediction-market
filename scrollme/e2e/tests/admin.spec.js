const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { login, chooseSize, ADMIN, findProduct, fillAddress } = require('./helpers');

// Real JPEGs, made with the API's own image library.
const sharp = require(path.resolve(__dirname, '../../backend/node_modules/sharp'));
const photo = (colour) =>
  sharp({ create: { width: 1200, height: 1600, channels: 3, background: colour } })
    .jpeg()
    .toBuffer();

test.describe('administration', () => {
  test('customers cannot open admin pages or call admin APIs', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    const status = await page.evaluate(async () => (await fetch('/api/admin/stats')).status);
    expect(status).toBe(403);
  });

  test('admin fulfils an order and edits stock', async ({ page, browser, request }) => {
    // A customer places and pays for an order.
    const product = await findProduct(request, 'inStock=true&minPrice=50');
    const customer = await browser.newPage();
    await login(customer);
    await customer.goto(`/${product.category}/${product._id}`);
    if (product.sizes.length) await chooseSize(customer, product.sizes[0]);
    await customer.getByRole('button', { name: 'BUY NOW' }).click();
    await expect(customer).toHaveURL(/\/checkout$/);
    await fillAddress(customer);
    await customer.getByRole('button', { name: 'PLACE ORDER' }).click();
    await customer.getByTestId('pay-option-card').click();
    await customer.getByRole('button', { name: 'Confirm' }).click();
    await customer.getByLabel('Card number').fill('4242424242424242');
    await customer.getByLabel('Expiry').fill('12/34');
    await customer.getByLabel('Security code').fill('123');
    await customer.getByLabel('Name on card').fill('John Doe');
    await customer.getByRole('button', { name: /^Pay / }).click();
    await expect(customer.getByTestId('order-status')).toHaveText('Paid');
    const orderNumber = (await customer.getByRole('heading', { name: /^ORDER GIS-/ }).textContent()).replace('ORDER ', '').trim();

    // The admin ships it with a tracking number.
    await login(page, ADMIN);
    await page.goto('/admin');
    await expect(page.getByText('Orders to fulfil')).toBeVisible();
    await page.goto(`/admin/orders?q=${orderNumber}`);
    await page.getByRole('button', { name: 'Manage' }).click();
    await page.getByLabel('New status').selectOption('shipped');
    await page.getByLabel('Tracking number').fill('1Z999AA10123456784');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Order marked Shipped')).toBeVisible();

    // The customer sees the tracking update.
    await customer.reload();
    await expect(customer.getByTestId('order-status')).toHaveText('Shipped');
    await expect(customer.getByText('1Z999AA10123456784')).toBeVisible();

    // Stock adjustment
    await page.goto(`/admin/products?q=${encodeURIComponent(product.name)}`);
    page.once('dialog', (d) => d.accept('+5'));
    await page.getByRole('button', { name: 'Stock' }).first().click();
    await expect(page.getByText('Stock updated')).toBeVisible();
  });

  test('admin bulk uploads products from a spreadsheet with photos', async ({ page }) => {
    const sku = `E2E-TRK-${Date.now()}`;
    const csv = [
      'sku,name,brand,category,price,stock,sizes,colour,images,active',
      `${sku},E2E Relaxed Tracksuit ${sku},Fear of God Essentials,Tracksuits,185,4,S|M|L,Black,front.jpg|back.jpg,yes`,
    ].join('\n');
    await login(page, ADMIN);
    await page.goto('/admin/products');
    await page.getByRole('link', { name: 'Bulk upload' }).first().click();
    await expect(page).toHaveURL(/\/admin\/import$/);
    await expect(page.getByRole('link', { name: 'Download the template' })).toHaveAttribute(
      'href',
      '/templates/product-upload-template.csv'
    );

    await page.getByLabel('Spreadsheet (.csv)').setInputFiles({ name: 'stock.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByLabel('Photos').setInputFiles([
      { name: 'front.jpg', mimeType: 'image/jpeg', buffer: await photo('#111111') },
      { name: 'back.jpg', mimeType: 'image/jpeg', buffer: await photo('#444444') },
    ]);
    await page.getByRole('button', { name: 'Check spreadsheet' }).click();
    await expect(page.getByText('Ready to import')).toBeVisible();
    await page.getByRole('button', { name: 'Import 1 products' }).click();
    await expect(page.getByText('Imported 1 new and updated 0 existing product(s)').first()).toBeVisible({ timeout: 30000 });

    // Live in the shop, with both photos.
    await page.goto(`/products?q=${sku}`);
    await page
      .getByRole('link', { name: `E2E Relaxed Tracksuit ${sku}` })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: `E2E Relaxed Tracksuit ${sku}` })).toBeVisible();
    const thumbs = page.getByRole('group', { name: 'Product photos' }).getByRole('button');
    await expect(thumbs).toHaveCount(2);
    await thumbs.nth(1).click();
    await expect(page.getByRole('img', { name: `E2E Relaxed Tracksuit ${sku}` })).toHaveAttribute(
      'src',
      /^\/api\/uploads\/[a-f0-9]{32}\.webp$/
    );
    const loaded = await page
      .getByRole('img', { name: `E2E Relaxed Tracksuit ${sku}` })
      .evaluate((img) => img.complete && img.naturalWidth > 0);
    expect(loaded).toBe(true);
  });
});
