import { expect, test } from '@playwright/test';

const quotation = {
  marketLabel: 'Week 33',
  updatedAt: '2026-08-12T08:15:00+02:00',
  validUntil: '2026-08-16',
  retrievedAt: '2026-08-12T08:15:02+02:00',
  currency: 'EUR',
  source: 'api',
  products: [
    {
      id: 'tuber-aestivum',
      name: 'Summer Truffle',
      latin: 'Tuber aestivum',
      description: 'Fresh selection of the week.',
      origin: 'Italy',
      badge: 'Fresh',
      availability: 'available',
      grades: [
        { id: 'first-choice', labelKey: 'product.first', detail: '20–80 g', amount: 140 },
        { id: 'second-choice', labelKey: 'product.second', detail: '', amount: 120 }
      ]
    }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/quotations?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(quotation)
    });
  });
});

test('shows price and order actions without a presentation flow', async ({ page }) => {
  await page.goto('/?lang=en');
  await expect(page.getByRole('heading', { name: 'Summer Truffle' })).toBeVisible();
  await expect(page.getByText('€140')).toBeVisible();
  await expect(page.getByRole('link', { name: /Order — Summer Truffle/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /WhatsApp — Summer Truffle/ })).toBeVisible();
});

test('changes language and persists it in the URL', async ({ page }) => {
  await page.goto('/?lang=it');
  await page.getByRole('button', { name: 'FR' }).click();
  await expect(page).toHaveURL(/lang=fr/);
  await expect(page.getByRole('link', { name: 'Ouvrir la cotation' })).toBeVisible();
});

test('mobile keeps high-priority actions visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only assertion');
  await page.goto('/?lang=en');
  await expect(page.locator('.mobile-bar')).toBeVisible();
  await expect(page.locator('.mobile-bar').getByRole('link', { name: 'WhatsApp' })).toBeVisible();
  await expect(page.locator('.mobile-bar').getByRole('link', { name: 'Prices' })).toBeVisible();
});
