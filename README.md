# House of Tartufo — Weekly Fresh Truffle Quotations v2

Production-oriented redesign of the weekly fresh-truffle quotation experience.

## Product principles

- Quotation first: prices are visible immediately, without a forced slide/presentation flow.
- Light premium visual system: ivory, warm white, espresso, truffle brown and champagne gold.
- Safe data rendering: external Sheet values are inserted with DOM text nodes, never trusted as HTML.
- Resilient pricing: serverless API -> published Google Sheet -> last known good browser cache.
- Accessible by default: semantic sections, real buttons, visible focus, high-contrast text, mobile tap targets and reduced-motion support.
- Conversion focused: each product has an order action and a pre-filled WhatsApp request.

## Stack

- Vite
- Vanilla JavaScript ES modules
- Zod for runtime validation
- Papa Parse for CSV parsing
- Vitest for unit tests
- Playwright for critical browser journeys
- Optional Vercel-style serverless endpoint in `api/quotations.js`

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Tests:

```bash
npm test
npx playwright install chromium
npm run test:e2e
```

## Data flow

1. The client requests `/api/quotations?lang=it|en|fr|nl`.
2. If the API is unavailable, the client reads the published Google Sheet CSV directly.
3. CSV is parsed and normalized into a typed quotation model.
4. A successful quotation is saved locally as a last-known-good fallback.
5. If both live sources fail, the cached quotation is shown with an explicit degraded-data notice.

The API adds a 10-minute cache and `stale-while-revalidate` headers, avoiding the old two-minute polling loop.

## Google Sheet contract

The existing key-based format remains compatible. Columns are expected in this order:

```text
key,it,en,fr,nl
```

Core product fields use `tN-*` keys. The parser now supports many products rather than stopping at four.

Recommended fields:

```text
week-label
updated-at
valid-until

t1-attivo
t1-id
t1-nome
t1-latin
t1-prima
t1-standard
t1-unit
t1-standard-unit
t1-badge
t1-desc
t1-origin
t1-availability
```

`availability` accepts values equivalent to available, limited or sold out. Unknown values safely default to available.

Prices should ideally be numeric (`140`) rather than presentation strings (`€140/kg`). The parser still accepts the legacy formatted values.

## Internationalisation

UI copy lives in `src/i18n.js` and product content remains driven by the language columns in the Sheet. Language priority is:

1. `?lang=` URL parameter
2. saved user preference
3. browser language
4. Italian fallback

Adding a new language no longer requires rewriting the page structure.

## Deployment safety

The legacy `index.html.html` remains untouched on the refactor branch. The new application entry is `index.html`.

Recommended flow:

```text
feature/refactor branch -> preview deployment -> QA -> pull request -> main
```

Do not merge until the preview has been checked with the real production Sheet and the CI workflow is green.

## CI

`.github/workflows/ci.yml` runs:

- unit tests
- production build
- Playwright desktop/mobile critical journeys

## Key regressions covered

- European price parsing
- dynamic product counts above the previous four-item limit
- inactive products
- language switching
- product-level ordering actions
- product-level WhatsApp actions
- mobile quick-action bar
