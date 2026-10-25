const { test, expect } = require('@playwright/test');
const { login, ADMIN, findProduct } = require('./helpers');

test.describe('contact, shop details and legal pages', () => {
  test('a shopper sends a sourcing request and the admin answers it from Messages', async ({ page, browser }) => {
    const item = `Essentials hoodie in black ${Date.now()}`;
    await page.goto('/');
    await page.getByRole('link', { name: /Send a request/ }).click();
    await expect(page).toHaveURL(/\/contact-us\?type=sourcing$/);
    await expect(page.getByRole('radio', { name: /Find me an item/ })).toBeChecked();
    const form = page.getByRole('main');
    await form.getByLabel('Name').fill('Ada Lovelace');
    await form.getByLabel('Email').fill('ada@example.com');
    await form.getByLabel('What are you looking for?').fill(item);
    await form.getByLabel(/^Size/).fill('L');
    await form.getByLabel(/^Budget/).fill('£120');
    await form.getByLabel(/Any details/).fill('Brand new please, needed by Friday.');
    await form.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('status')).toContainText("we've got your message");

    const admin = await browser.newPage();
    await login(admin, ADMIN);
    await admin.goto('/admin');
    await admin.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Messages' }).click();
    const card = admin.getByRole('article', { name: 'Message from Ada Lovelace' }).filter({ hasText: item });
    await expect(card).toContainText('Sourcing request');
    await expect(card).toContainText('£120');
    await expect(card.getByRole('link', { name: 'Reply by email' })).toHaveAttribute('href', /^mailto:ada@example\.com\?subject=/);
    await card.getByRole('button', { name: 'Mark replied' }).click();
    await expect(admin.getByRole('article', { name: 'Message from Ada Lovelace' }).filter({ hasText: item })).toHaveCount(0);
    await admin.getByRole('tab', { name: /^Replied/ }).click();
    await expect(admin.getByRole('article', { name: 'Message from Ada Lovelace' }).filter({ hasText: item })).toBeVisible();
  });

  test('shop details appear in the footer and on the legal pages', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/shop');
    await page.getByLabel('Legal name').fill('Get It Sourced Ltd');
    await page.getByLabel('Business address').fill('16 Benton Street\nManchester\nM9 4NG');
    await page.getByLabel('Contact email').fill('hello@getitsourced.example');
    await page.getByLabel('Company number').fill('12345678');
    await page.getByLabel('Instagram').fill('https://www.instagram.com/getitsourced');
    await page.getByRole('button', { name: 'Save shop details' }).click();
    await expect(page.getByText('Shop details saved').first()).toBeVisible();

    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'hello@getitsourced.example' })).toHaveAttribute(
      'href',
      'mailto:hello@getitsourced.example'
    );
    await expect(footer.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/getitsourced');

    await footer.getByRole('link', { name: 'Terms' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Terms & conditions' })).toBeVisible();
    await expect(page.getByText('16 Benton Street')).toBeVisible();
    await expect(page.getByText('is a trading name of Get It Sourced Ltd')).toBeVisible();
    await expect(page.getByText('Company number 12345678')).toBeVisible();

    for (const [link, heading, text] of [
      ['Privacy', 'Privacy policy', 'Information Commissioner'],
      ['Returns', 'Returns & refunds', 'within 14 days of receiving it'],
      ['Delivery', 'Delivery', 'Standard delivery:'],
    ]) {
      await page.getByRole('contentinfo').getByRole('link', { name: link, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });

  test('checkout links to the terms before the order is placed', async ({ page, request }) => {
    const product = await findProduct(request, 'inStock=true&minPrice=50');
    await login(page);
    const added = await page.request.post('/api/cart/add', { data: { productId: product._id, size: product.sizes[0] || '', quantity: 1 } });
    expect(added.ok()).toBe(true);
    await page.goto('/checkout');
    await expect(page.getByRole('link', { name: 'Terms & conditions' })).toHaveAttribute('href', '/terms');
    // Leave the shared demo bag empty for the other tests.
    await page.request.delete('/api/cart/clear');
  });
});
