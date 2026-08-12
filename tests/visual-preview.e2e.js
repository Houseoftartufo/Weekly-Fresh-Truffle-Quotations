import { expect, test } from '@playwright/test';

const currentQuotation = {
  marketLabel: 'Offer valid until 09/08/2026',
  updatedAt: null,
  validUntil: null,
  retrievedAt: '2026-08-12T01:23:07.582Z',
  currency: 'EUR',
  source: 'api',
  products: [
    {
      id: 'tuber-aestivum',
      name: 'Summer Truffle',
      latin: 'Tuber Aestivum',
      description: 'Delicate versatile aroma, ideal for summer cuisine.',
      origin: '',
      badge: '',
      availability: 'available',
      featured: true,
      shopifyHandle: 'summer-black-truffle-tuber-aestivum',
      productUrl: 'https://houseoftartufo.com/products/summer-black-truffle-tuber-aestivum',
      imageUrl: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh_Summer_Truffle_Aestivum_Photo_1.webp?v=1778781787',
      imageAlt: 'Fresh Summer Truffle Tuber Aestivum',
      gallery: [
        {
          url: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh_Summer_Truffle_Aestivum_Photo_1.webp?v=1778781787',
          alt: 'Fresh Summer Truffle Tuber Aestivum'
        }
      ],
      grades: [
        { id: 'first-choice', labelKey: 'product.first', detail: 'Min 100g', amount: 155 },
        { id: 'second-choice', labelKey: 'product.second', detail: '', amount: 141 }
      ]
    }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/quotations?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(currentQuotation)
    });
  });
});

test('capture real V3 landing preview', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile') test.skip();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/?lang=en', { waitUntil: 'networkidle' });
  await expect(page.locator('#quotation').getByRole('heading', { name: 'Summer Truffle' })).toBeVisible();
  await page.locator('.product-image').evaluate((img) => img.decode?.().catch(() => {}));
  await page.screenshot({ path: 'artifacts/landing-desktop.png', fullPage: true });

  await page.locator('[data-hero-open]').click();
  await expect(page.locator('.truffle-explorer')).toBeVisible();
  await page.locator('.explorer-image').evaluate((img) => img.decode?.().catch(() => {}));
  await page.screenshot({ path: 'artifacts/explorer-desktop.png', fullPage: true });
});

test('capture real V3 mobile preview', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'mobile') test.skip();
  await page.goto('/?lang=en', { waitUntil: 'networkidle' });
  await expect(page.locator('#quotation').getByRole('heading', { name: 'Summer Truffle' })).toBeVisible();
  await page.locator('.product-image').evaluate((img) => img.decode?.().catch(() => {}));
  await page.screenshot({ path: 'artifacts/landing-mobile.png', fullPage: true });
});
