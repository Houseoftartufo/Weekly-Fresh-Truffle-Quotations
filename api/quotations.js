import { parseSheetCsv, SHEET_CSV_URL } from '../src/data.js';

const SUPPORTED = new Set(['en', 'fr', 'nl', 'it']);
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

function dedupeGallery(items = []) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const url = normalizeUrl(typeof item === 'string' ? item : item?.url || item?.src);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push({ url, alt: typeof item === 'string' ? '' : String(item?.alt || '') });
  }
  return result;
}

function handleFromProductUrl(url) {
  try {
    const parsed = new URL(url, STORE_ORIGIN);
    return parsed.pathname.match(/\/products\/([^/?#]+)/i)?.[1] || null;
  } catch {
    return null;
  }
}

async function productMetaFromPage(url) {
  if (!url) return {};
  const response = await fetch(url, {
    headers: { Accept: 'text/html', 'User-Agent': 'HouseOfTartufo-Quotation/3.0' },
    signal: AbortSignal.timeout(4500)
  });
  if (!response.ok) throw new Error(`Shopify product page HTTP ${response.status}`);
  const html = await response.text();
  const imageUrl = normalizeUrl(readMeta(html, 'og:image'));
  const imageAlt = readMeta(html, 'og:image:alt') || null;
  return {
    productUrl: normalizeUrl(readMeta(html, 'og:url')) || url,
    imageUrl,
    imageAlt,
    gallery: imageUrl ? [{ url: imageUrl, alt: imageAlt || '' }] : []
  };
}

async function productJsonFromHandle(handle) {
  if (!handle) return {};
  const response = await fetch(`${STORE_ORIGIN}/products/${encodeURIComponent(handle)}.js`, {
    headers: { Accept: 'application/json', 'User-Agent': 'HouseOfTartufo-Quotation/3.0' },
    signal: AbortSignal.timeout(4500)
  });
  if (!response.ok) throw new Error(`Shopify product JSON HTTP ${response.status}`);
  const data = await response.json();
  const gallery = dedupeGallery(data?.images || data?.media || []);
  const featured = normalizeUrl(data?.featured_image || gallery[0]?.url);
  return {
    productUrl: `${STORE_ORIGIN}/products/${encodeURIComponent(handle)}`,
    imageUrl: featured || gallery[0]?.url || null,
    imageAlt: data?.title || null,
    gallery: gallery.length ? gallery : featured ? [{ url: featured, alt: data?.title || '' }] : []
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
    headers: { Accept: 'application/json', 'User-Agent': 'HouseOfTartufo-Quotation/3.0' },
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
    let handle = product.shopifyHandle || handleFromProductUrl(product.productUrl);

    if (!handle) {
      const match = await predictiveProduct(product);
      if (match) {
        const matchUrl = normalizeUrl(match.url);
        handle = handleFromProductUrl(matchUrl);
        result = {
          productUrl: matchUrl,
          imageUrl: normalizeUrl(match.featured_image?.url || match.featured_image || match.image),
          imageAlt: match.featured_image?.alt || match.title || null,
          gallery: []
        };
      }
    }

    if (handle) {
      try {
        const jsonProduct = await productJsonFromHandle(handle);
        result = {
          ...result,
          ...jsonProduct,
          productUrl: result.productUrl || jsonProduct.productUrl
        };
      } catch {
        const pageUrl = result.productUrl || `${STORE_ORIGIN}/products/${encodeURIComponent(handle)}`;
        result = { ...result, ...(await productMetaFromPage(pageUrl)) };
      }
    } else if (result.productUrl) {
      result = { ...result, ...(await productMetaFromPage(result.productUrl)) };
    }
  } catch {
    // Image enrichment must never make the weekly quotation unavailable.
  }

  result.gallery = dedupeGallery([
    ...(result.imageUrl ? [{ url: result.imageUrl, alt: result.imageAlt || '' }] : []),
    ...(result.gallery || [])
  ]);
  shopifyCache.set(cacheKey, { value: result, savedAt: Date.now() });
  return result;
}

async function enrichProducts(products) {
  const enriched = [];
  const concurrency = 4;
  for (let start = 0; start < products.length; start += concurrency) {
    const chunk = products.slice(start, start + concurrency);
    const results = await Promise.all(chunk.map(async (product) => {
      const shopify = await lookupShopifyProduct(product);
      const imageUrl = product.imageUrl || shopify.imageUrl || null;
      const imageAlt = product.imageAlt || shopify.imageAlt || product.name;
      const gallery = dedupeGallery([
        ...(imageUrl ? [{ url: imageUrl, alt: imageAlt }] : []),
        ...(product.gallery || []),
        ...(shopify.gallery || [])
      ]).map((item) => ({ ...item, alt: item.alt || imageAlt }));

      return {
        ...product,
        imageUrl,
        imageAlt,
        gallery,
        productUrl: product.productUrl || shopify.productUrl || null
      };
    }));
    enriched.push(...results);
  }
  return enriched;
}

export default async function handler(req, res) {
  const language = SUPPORTED.has(req.query?.lang) ? req.query.lang : 'en';
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
