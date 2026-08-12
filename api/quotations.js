import { parseSheetCsv, SHEET_CSV_URL } from '../src/data.js';

const SUPPORTED = new Set(['it', 'en', 'fr', 'nl']);
const CACHE_TTL_MS = 10 * 60 * 1000;
const SHOPIFY_CACHE_TTL_MS = 60 * 60 * 1000;
const STORE_ORIGIN = 'https://houseoftartufo.com';
const memoryCache = new Map();
const shopifyCache = new Map();

function getCached(language) {
  const entry = memoryCache.get(language);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) return null;
  return entry.quotation;
}

function saveCached(language, quotation) {
  memoryCache.set(language, { quotation, savedAt: Date.now() });
}

function normalizeUrl(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `${STORE_ORIGIN}${raw}`;
  return raw;
}

function normalizeMatch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreCandidate(candidate, product) {
  const title = normalizeMatch(candidate?.title);
  const latin = normalizeMatch(product.latin);
  const name = normalizeMatch(product.name);
  if (!title) return -1;

  let score = 0;
  if (latin && title.includes(latin)) score += 100;
  if (name && title.includes(name)) score += 80;

  const terms = [...new Set(`${latin} ${name}`.split(' ').filter((term) => term.length > 3))];
  for (const term of terms) if (title.includes(term)) score += 10;
  return score;
}

function readMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/&amp;/g, '&');
  }
  return null;
}

async function productMetaFromPage(url) {
  if (!url) return {};
  const response = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'HouseOfTartufo-Quotation/2.0' },
    signal: AbortSignal.timeout(4500)
  });
  if (!response.ok) throw new Error(`Shopify product page HTTP ${response.status}`);
  const html = await response.text();
  return {
    productUrl: normalizeUrl(readMeta(html, 'og:url')) || url,
    imageUrl: normalizeUrl(readMeta(html, 'og:image')),
    imageAlt: readMeta(html, 'og:image:alt') || null
  };
}

async function predictiveProduct(product) {
  const query = product.latin || product.name;
  if (!query) return null;

  const params = new URLSearchParams({ q: query });
  params.set('resources[type]', 'product');
  params.set('resources[limit]', '10');
  params.set('resources[options][unavailable_products]', 'show');

  const response = await fetch(`${STORE_ORIGIN}/search/suggest.json?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'HouseOfTartufo-Quotation/2.0' },
    signal: AbortSignal.timeout(4500)
  });
  if (!response.ok) throw new Error(`Shopify predictive search HTTP ${response.status}`);
  const data = await response.json();
  const candidates = data?.resources?.results?.products || [];
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => scoreCandidate(b, product) - scoreCandidate(a, product))[0] || null;
}

async function lookupShopifyProduct(product) {
  const cacheKey = product.shopifyHandle || product.latin || product.name;
  const cached = shopifyCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < SHOPIFY_CACHE_TTL_MS) return cached.value;

  let result = {};
  try {
    if (product.shopifyHandle) {
      const url = `${STORE_ORIGIN}/products/${encodeURIComponent(product.shopifyHandle)}`;
      result = await productMetaFromPage(url);
    } else {
      const match = await predictiveProduct(product);
      if (match) {
        result = {
          productUrl: normalizeUrl(match.url),
          imageUrl: normalizeUrl(match.featured_image?.url || match.featured_image || match.image),
          imageAlt: match.featured_image?.alt || match.title || null
        };
        if (!result.imageUrl && result.productUrl) {
          result = { ...result, ...(await productMetaFromPage(result.productUrl)) };
        }
      }
    }
  } catch {
    // Image enrichment must never make the weekly quotation unavailable.
  }

  shopifyCache.set(cacheKey, { value: result, savedAt: Date.now() });
  return result;
}

async function enrichProducts(products) {
  const enriched = [];
  const concurrency = 4;
  for (let start = 0; start < products.length; start += concurrency) {
    const chunk = products.slice(start, start + concurrency);
    const results = await Promise.all(chunk.map(async (product) => {
      if (product.imageUrl && product.productUrl) return product;
      const shopify = await lookupShopifyProduct(product);
      return {
        ...product,
        imageUrl: product.imageUrl || shopify.imageUrl || null,
        imageAlt: product.imageAlt || shopify.imageAlt || product.name,
        productUrl: product.productUrl || shopify.productUrl || null
      };
    }));
    enriched.push(...results);
  }
  return enriched;
}

export default async function handler(req, res) {
  const language = SUPPORTED.has(req.query?.lang) ? req.query.lang : 'it';
  const cached = getCached(language);

  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json({ ...cached, source: 'api' });
  }

  try {
    const response = await fetch(SHEET_CSV_URL, {
      headers: { Accept: 'text/csv' },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) throw new Error(`Google Sheet returned HTTP ${response.status}`);

    const quotation = parseSheetCsv(await response.text(), language);
    quotation.products = await enrichProducts(quotation.products);
    saveCached(language, quotation);

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json({ ...quotation, source: 'api' });
  } catch (error) {
    const stale = memoryCache.get(language)?.quotation;
    if (stale) {
      res.setHeader('Warning', '110 - Response is stale');
      return res.status(200).json({ ...stale, source: 'api' });
    }

    return res.status(503).json({
      error: 'quotation_unavailable',
      message: 'The quotation source is temporarily unavailable.'
    });
  }
}
