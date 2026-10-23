const { test, expect } = require('@playwright/test');
const { login, ADMIN, findProduct, fillAddress } = require('./helpers');

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
    if (product.sizes.length) await customer.getByLabel('Size').selectOption(product.sizes[0]);
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
    const orderNumber = (await customer.getByRole('heading', { name: /^ORDER SM-/ }).textContent()).replace('ORDER ', '').trim();

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
});
