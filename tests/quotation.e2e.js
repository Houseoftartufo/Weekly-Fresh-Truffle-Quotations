import { expect, test } from '@playwright/test';

const imageOne = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480"%3E%3Crect width="100%25" height="100%25" fill="%23efe7dc"/%3E%3C/svg%3E';
const imageTwo = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480"%3E%3Crect width="100%25" height="100%25" fill="%23d7c4aa"/%3E%3C/svg%3E';
const imageThree = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480"%3E%3Crect width="100%25" height="100%25" fill="%23b8a48d"/%3E%3C/svg%3E';

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
      featured: true,
      shopifyHandle: 'italian-summer-truffle-fresh-tuber-aestivum',
      productUrl: 'https://houseoftartufo.com/products/italian-summer-truffle-fresh-tuber-aestivum',
      imageUrl: imageOne,
      imageAlt: 'Fresh Summer Black Truffle Tuber aestivum',
      gallery: [
        { url: imageOne, alt: 'Fresh Summer Black Truffle Tuber aestivum' },
        { url: imageTwo, alt: 'Summer truffle macro texture' }
      ],
      grades: [
        { id: 'first-choice', labelKey: 'product.first', detail: '20–80 g', amount: 140 },
        { id: 'second-choice', labelKey: 'product.second', detail: '', amount: 120 }
      ]
    },
    {
      id: 'tuber-borchii',
      name: 'Bianchetto',
      latin: 'Tuber borchii',
      description: 'Aromatic seasonal selection.',
      origin: 'Italy',
      badge: 'Seasonal',
      availability: 'limited',
      featured: false,
      shopifyHandle: 'bianchetto-truffle-tuber-borchii',
      productUrl: 'https://houseoftartufo.com/products/bianchetto-truffle-tuber-borchii',
      imageUrl: imageThree,
      imageAlt: 'Fresh Bianchetto Tuber borchii',
      gallery: [{ url: imageThree, alt: 'Fresh Bianchetto Tuber borchii' }],
      grades: [
        { id: 'first-choice', labelKey: 'product.first', detail: '8–30 g', amount: 530 }
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

test('uses English as primary language and EN FR NL IT order', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.language-switcher .lang-button')).toHaveText(['EN', 'FR', 'NL', 'IT']);
  await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Open quotation' })).toBeVisible();
});

test('shows price, Shopify image and order actions without a presentation flow', async ({ page }) => {
  await page.goto('/?lang=en');
  const quotationSection = page.locator('#quotation');
  await expect(quotationSection.getByRole('heading', { name: 'Summer Truffle' })).toBeVisible();
  await expect(quotationSection.getByText('€140')).toBeVisible();
  await expect(quotationSection.locator('.product-image').first()).toBeAttached();
  await expect(quotationSection.getByRole('link', { name: /Order — Summer Truffle/ })).toBeVisible();
  await expect(quotationSection.getByRole('link', { name: /WhatsApp — Summer Truffle/ })).toBeVisible();
});

test('opens fullscreen explorer, changes gallery image and navigates seasonal truffles', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('#quotation').getByRole('button', { name: 'View details — Summer Truffle' }).click();

  const explorer = page.locator('.truffle-explorer');
  await expect(explorer).toBeVisible();
  await expect(explorer.getByRole('heading', { name: 'Summer Truffle' })).toBeVisible();
  await expect(explorer.getByText('€140')).toBeVisible();

  await explorer.getByRole('button', { name: 'Image 2 / 2' }).click();
  await expect(explorer.getByRole('img', { name: 'Summer truffle macro texture' })).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(explorer.getByRole('heading', { name: 'Bianchetto' })).toBeVisible();
  await expect(explorer.getByText('€530')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(explorer).not.toBeVisible();
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
