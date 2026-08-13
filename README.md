# House of Tartufo — Weekly Fresh Truffle Quotations v2

Production-oriented weekly fresh-truffle quotation experience.

## Product principles

- Quotation first: current prices are visible immediately.
- Light premium visual system: ivory, warm white, espresso, truffle brown and champagne gold.
- Fully data-driven: each active truffle in the Sheet/Excel becomes a card automatically; removing or disabling it removes the card.
- Adaptive layout: one, two, three or many products automatically change the grid.
- Shopify imagery: the API can resolve the product page and featured image directly from `houseoftartufo.com`.
- Safe rendering: Sheet values are inserted as text nodes, never trusted HTML.
- Resilient data flow: API -> published Google Sheet -> last-known-good browser cache.
- Product-specific order and pre-filled WhatsApp actions.
- Accessible keyboard, touch and reduced-motion behaviour.

## Primary languages

Official language order:

```text
EN -> FR -> NL -> IT
```

English is the primary/default language. Resolution order:

1. `?lang=` URL parameter
2. saved user preference
3. supported browser language
4. English fallback

## Stack

- Vite
- Vanilla JavaScript ES modules
- Zod runtime validation
- Papa Parse CSV parsing
- Vitest unit tests
- Playwright critical journeys
- Vercel serverless endpoint in `api/quotations.js`

## Development

```bash
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

## Data flow

1. Browser requests `/api/quotations?lang=en|fr|nl|it`.
2. API reads the published Google Sheet CSV.
3. Every active product found in the Sheet is normalized into the quotation model.
4. The API enriches products with their House of Tartufo Shopify product URL and featured image when possible.
5. The frontend renders the exact number of products returned.
6. A valid quotation is cached as last-known-good.
7. Image/catalog lookup failures never block prices.

Quotation API cache: 10 minutes. Shopify enrichment cache: one hour.

## Recommended Excel / Google Sheet format

The recommended format is **one row = one truffle**.

Example columns:

```text
active
name_en
name_fr
name_nl
name_it
latin
origin
availability
first_price
first_detail
second_price
second_detail
shopify_handle
product_url
image_url
```

Example:

```text
yes | Summer Black Truffle | ... | Tuber aestivum | Italy | available | 140 | 20-80 g | 120 | 5-20 g | italian-summer-truffle-fresh-tuber-aestivum
```

Behaviour:

- add a row with `active=yes` -> a new card appears
- set `active=no` -> card disappears
- delete the row -> card disappears
- change price -> quotation changes
- change availability -> status changes
- any number of product rows is supported

`shopify_handle` is recommended because it gives a deterministic product/image match. If omitted, the server attempts to find the product on House of Tartufo using its scientific/product name. `product_url` and `image_url` can always be supplied explicitly as overrides.

### Existing key/value Sheet remains compatible

The old structure continues to work:

```text
key,it,en,fr,nl
```

with fields such as:

```text
t1-attivo
t1-nome
t1-latin
t1-prima
t1-standard
...
```

Product numbering no longer needs to be continuous: `t1`, `t4`, `t17` are all discovered automatically.

## Prices

Use numeric values when possible:

```text
140
1250.50
```

Legacy values such as `€140/kg` and European formatting are still accepted.

## Shopify images

The server enrichment strategy is:

1. explicit `image_url` / `product_url` from the Sheet, if supplied
2. exact `shopify_handle`, if supplied
3. Shopify predictive product search using scientific/product name
4. no image if no safe match is found

The quotation remains fully usable if Shopify image enrichment is unavailable.

## Deployment safety

The legacy `index.html.html` remains untouched on the refactor branch.

Recommended release flow:

```text
refactor branch -> CI -> preview -> visual QA -> PR -> main -> production
```

## CI coverage

GitHub Actions checks:

- European price parsing
- legacy Sheet compatibility
- more than four products
- gaps in legacy product numbering
- row-per-product Excel model
- active/inactive products
- production build
- language switching
- product-level order and WhatsApp actions
- desktop/mobile Playwright journeys
