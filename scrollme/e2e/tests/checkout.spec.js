const { test, expect } = require('@playwright/test');
const { login, findProduct, fillAddress } = require('./helpers');

const addToCart = async (page, product) => {
  await page.goto(`/${product.category}/${product._id}`);
  if (product.sizes.length) await page.getByLabel('Size').selectOption(product.sizes[0]);
  await page.getByRole('button', { name: 'ADD TO CART' }).click();
  await expect(page.getByText('Product added to cart.')).toBeVisible();
};

test.describe('cart and checkout', () => {
  test('cart totals come from the server and quantity updates', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&minPrice=100&maxPrice=500');
    await login(page);
    await page.goto('/cart');
    // Start from an empty cart.
    for (const btn of await page.getByRole('button', { name: 'Remove' }).all()) await btn.click();
    await addToCart(page, product);

    await page.goto('/cart');
    await expect(page.getByText(product.name)).toBeVisible();
    const subtotal = product.price;
    await expect(page.getByText(`$ ${subtotal.toFixed(2)}`).first()).toBeVisible();
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(page.getByLabel('Quantity', { exact: true })).toHaveText('2');
    // subtotal x2, 10% tax, $20 delivery
    const total = subtotal * 2 + Math.round(subtotal * 2 * 0.1 * 100) / 100 + 20;
    await expect(page.getByText(`$ ${total.toFixed(2)}`)).toBeVisible();
  });

  test('requires a size and sign-in before adding to the cart', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&category=tshirts');
    await page.goto(`/${product.category}/${product._id}`);
    await page.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page);
    await page.goto(`/${product.category}/${product._id}`);
    await page.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByText('Please choose a size.')).toBeVisible();
  });

  test('full purchase with card: validation, decline, success, history and stock @phone', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&minPrice=200');
    const before = product.stock;
    await login(page);
    await addToCart(page, product);
    await page.goto('/checkout');

    // Address validation
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    await expect(page.getByText('Enter a valid phone number')).toBeVisible();
    await fillAddress(page);

    // Payment method sheet
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    const sheet = page.getByRole('dialog', { name: 'Secure Payment' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('Your payment is 100% secure')).toBeVisible();
    await expect(sheet.getByText('PayPal', { exact: true })).toBeVisible();
    await sheet.getByTestId('pay-option-card').click();
    await sheet.getByRole('button', { name: 'Confirm' }).click();

    // Test-mode card page
    await expect(page).toHaveURL(/\/checkout\/mock\?order=/);
    await page.getByLabel('Card number').fill('4000 0000 0000 0002');
    await page.getByLabel('Expiry').fill('12/34');
    await page.getByLabel('Security code').fill('123');
    await page.getByLabel('Name on card').fill('Ada Lovelace');
    await page.getByRole('button', { name: /^Pay / }).click();
    await expect(page.getByText('Your card was declined')).toBeVisible();
    await page.getByLabel('Card number').fill('4242 4242 4242 4242');
    await page.getByRole('button', { name: /^Pay / }).click();

    await expect(page).toHaveURL(/\/orders\/.+checkout=success/);
    await expect(page.getByText('Your payment was received')).toBeVisible();
    await expect(page.getByTestId('order-status')).toHaveText('Paid');
    const orderNumber = (await page.getByRole('heading', { name: /^ORDER SM-/ }).textContent()).replace('ORDER ', '').trim();

    await page.goto('/account');
    await expect(page.getByText(orderNumber)).toBeVisible();

    const after = await (await request.get(`/api/product/${product._id}`)).json();
    expect(after.stock).toBe(before - 1);

    // The purchased line left the cart.
    await page.goto('/cart');
    await expect(page.getByText('Your bag is empty.')).toBeVisible();
  });

  test('pays with PayPal and can cancel an unpaid order', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&sort=price_asc');
    await login(page);
    await addToCart(page, product);
    await page.goto('/checkout');
    await fillAddress(page);
    await page.getByRole('radio', { name: /Express/ }).check();
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    const sheet = page.getByRole('dialog', { name: 'Secure Payment' });
    await sheet.getByTestId('pay-option-paypal').click();
    await sheet.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('button', { name: 'Pay with PayPal' })).toBeVisible();

    // Walk away, then cancel from the order page.
    await page.getByRole('link', { name: 'Cancel and return to the store' }).click();
    await expect(page.getByText('Payment was not completed')).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'CANCEL ORDER' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Cancelled');
  });
});
