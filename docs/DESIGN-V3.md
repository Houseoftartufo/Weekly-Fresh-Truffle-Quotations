# House of Tartufo — Weekly Quotations V3 Design Reference

Status: APPROVED VISUAL DIRECTION
Date: 2026-08-12
Branch: `refactor/light-quotation-v2`

## Core direction

House of Tartufo Weekly Quotations V3 must combine:

- Apple-like discipline, spacing and product focus
- Nike-like editorial impact, contrast and visual tension
- Modern startup UX clarity and data intelligence

The result must feel like a premium international B2B fresh-truffle market platform, not a generic beige luxury template, restaurant site or standard ecommerce grid.

## Approved visual reference

The approved generated preview from the design review is the visual target for implementation.

Conversation artifact filename:

`a_clean_high_end_website_landing_page_ui_mockup.png`

This image is the authoritative composition/mood reference for V3. If the implementation and this document differ on visual character, preserve the visual language of the approved preview while keeping all real data and functional constraints below.

## Visual language

### Palette

- warm ivory / off-white as the primary canvas
- near-black / espresso for high-impact sections
- truffle brown as an organic secondary tone
- restrained champagne/gold accents only for emphasis
- subtle green only for live availability/status

Avoid large areas of generic beige with low contrast.

### Typography

- strong modern sans-serif for navigation, labels, controls and data
- editorial serif for selected display headlines/product storytelling
- prices are oversized visual anchors
- use compact uppercase technical labels for market metadata

### Composition

- strong asymmetry rather than repeated identical cards
- generous whitespace
- large macro product photography
- alternating light and dark sections for rhythm
- product imagery should occupy roughly 40–60% of important product modules
- use bold crops and controlled overlap where appropriate

## Page structure

1. Premium compact header
   - House of Tartufo brand
   - quotation navigation/status
   - language order: EN / FR / NL / IT
   - English is default/fallback

2. Hero
   - large real truffle photography
   - strong headline such as `THE RIGHT PRICE. THIS WEEK.`
   - short B2B explanation
   - primary current-quotation CTA
   - WhatsApp CTA

3. Live market strip
   - current week/update
   - origin
   - availability
   - next update / validity
   - currency
   - visually resembles a premium market/status terminal

4. Dynamic weekly selection
   - first/featured product receives dominant editorial treatment
   - subsequent products use a responsive asymmetric grid
   - no generic equal-card repetition when avoidable

5. Trust / service strip
   - exceptional quality
   - professional shipping
   - built for professionals

6. Strong closing CTA
   - sourcing / recurring volume message
   - contact and WhatsApp actions

7. Premium footer

## Product module requirements

Every product is generated from quotation data. Product modules can include:

- real Shopify product image
- product name
- Latin name
- origin
- grade
- size/format
- price per kg
- availability
- order/deep-link CTA
- WhatsApp CTA

Price must be one of the largest elements in the product module.

## Dynamic Excel / Google Sheet behavior

The design must adapt automatically to the number of active products.

- add a product in the Sheet -> a product module appears
- remove a product / mark inactive -> it disappears
- 1 product -> dedicated campaign-like full-width featured composition
- 2 products -> strong two-product composition
- 3 products -> featured + secondary editorial modules
- 4+ products -> responsive asymmetric market grid

The current legacy key-based format remains supported, including non-contiguous keys. A row-per-product format is also supported/preferred for future maintenance.

## Shopify image behavior

Images should come from `houseoftartufo.com` product pages whenever possible.

Priority:

1. explicit image/product URL from Sheet if provided
2. explicit Shopify handle from Sheet
3. automatic product matching using Latin/product name
4. graceful image-less fallback; quotation must never fail because Shopify image enrichment fails

The visual implementation should use these real product photos as major layout elements, not tiny thumbnails.

## Languages

Official order:

1. EN — primary/default/fallback
2. FR
3. NL
4. IT

Browser language or a saved preference may select FR/NL/IT automatically, but the product's canonical base experience remains English.

## Interaction principles

- normal vertical scrolling
- subtle premium reveals/hover effects only
- no decorative particle engines
- no forced loaders
- no custom cursor
- reduced-motion support
- clear visible focus states
- mobile-first interaction quality
- sticky mobile priority actions when useful

## UX standard

A professional buyer should understand within seconds:

1. what is available this week
2. the current price
3. the quality/grade
4. the origin
5. whether it is available
6. how to order/contact House of Tartufo

Visual wow must never obscure quotation clarity.

## Implementation constraint

Preserve the production architecture already implemented on `refactor/light-quotation-v2`:

- dynamic Sheet-driven quotation data
- Shopify enrichment
- EN / FR / NL / IT i18n
- schema validation
- last-known-good fallback
- API cache
- unit tests
- Playwright desktop/mobile tests
- CI

V3 is primarily a frontend/art-direction redesign. Do not regress the data engine while matching the approved visual reference.
