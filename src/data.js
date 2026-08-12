import Papa from 'papaparse';
import { z } from 'zod';

export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkO5iIBnRqk2cMtPnVgRqdXiMrRXycIAT5JYKgoaBeRXpcxHtGpK8KaWX2DWVNqrH25kPWoQPXx0FE/pub?output=csv';

const GradeSchema = z.object({
  id: z.string(),
  labelKey: z.enum(['product.first', 'product.second']),
  detail: z.string().default(''),
  amount: z.number().nonnegative().nullable()
});

const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  latin: z.string().default(''),
  description: z.string().default(''),
  origin: z.string().default(''),
  badge: z.string().default(''),
  availability: z.enum(['available', 'limited', 'sold-out']).default('available'),
  shopifyHandle: z.string().default(''),
  productUrl: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
  imageAlt: z.string().default(''),
  grades: z.array(GradeSchema).min(1)
});

export const QuotationSchema = z.object({
  marketLabel: z.string().default(''),
  updatedAt: z.string().nullable().default(null),
  validUntil: z.string().nullable().default(null),
  retrievedAt: z.string(),
  currency: z.literal('EUR').default('EUR'),
  products: z.array(ProductSchema).min(1),
  source: z.enum(['api', 'sheet', 'cache']).default('sheet')
});

const languageColumn = { it: 1, en: 2, fr: 3, nl: 4 };
const truthy = new Set(['si', 'sì', 'yes', 'oui', 'ja', '1', 'true', 'x', 'on', 'active']);
const falsey = new Set(['no', '0', 'false', 'off', 'inactive', 'disattivo', 'non']);

export function parsePrice(value) {
  if (value == null) return null;
  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/€|eur/gi, '')
    .replace(/\/kg/gi, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0]);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'fresh-truffle';
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseAvailability(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['sold out', 'sold-out', 'esaurito', 'épuisé', 'epuise', 'uitverkocht', 'no', '0', 'false'].includes(v)) return 'sold-out';
  if (['limited', 'limitato', 'limitata', 'limité', 'limite', 'beperkt'].includes(v)) return 'limited';
  return 'available';
}

function isActive(value, defaultValue = true) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return defaultValue;
  if (truthy.has(v)) return true;
  if (falsey.has(v)) return false;
  return defaultValue;
}

function firstValue(record, keys, fallback = '') {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return fallback;
}

function buildGrades(firstRaw, secondRaw, firstDetail = '', secondDetail = '') {
  const firstAmount = parsePrice(firstRaw);
  const secondAmount = parsePrice(secondRaw);
  const grades = [];

  if (firstAmount !== null || String(firstRaw || '').trim()) {
    grades.push({ id: 'first-choice', labelKey: 'product.first', detail: firstDetail, amount: firstAmount });
  }
  if (secondAmount !== null || String(secondRaw || '').trim()) {
    grades.push({ id: 'second-choice', labelKey: 'product.second', detail: secondDetail, amount: secondAmount });
  }
  if (!grades.length) grades.push({ id: 'first-choice', labelKey: 'product.first', detail: firstDetail, amount: null });
  return grades;
}

function normalizeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `https://houseoftartufo.com${raw}`;
  return raw;
}

function looksLikeTabularSheet(rows) {
  const headers = (rows[0] || []).map(normalizeHeader);
  const hasName = headers.some((header) => ['name', 'nome', 'name_it', 'nome_it', 'latin'].includes(header));
  const hasProductField = headers.some((header) => ['first_price', 'prima', 'price_1', 'availability', 'shopify_handle', 'product_url'].includes(header));
  return hasName && hasProductField;
}

function parseTabularSheet(rows, language) {
  const headers = rows[0].map(normalizeHeader);
  const records = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  const products = [];

  for (const record of records) {
    if (!isActive(firstValue(record, ['active', 'attivo', 'enabled'], 'yes'))) continue;

    const name = firstValue(record, [
      `name_${language}`, `nome_${language}`,
      'name_it', 'nome_it',
      'name', 'nome'
    ]);
    const latin = firstValue(record, ['latin', 'scientific_name', 'nome_scientifico']);
    if (!name && !latin) continue;

    const resolvedName = name || latin;
    const description = firstValue(record, [
      `description_${language}`, `desc_${language}`,
      'description_it', 'desc_it',
      'description', 'desc'
    ]);
    const origin = firstValue(record, [`origin_${language}`, `origine_${language}`, 'origin', 'origine']);
    const badge = firstValue(record, [`badge_${language}`, 'badge']);
    const handle = firstValue(record, ['shopify_handle', 'product_handle', 'handle']);
    const imageUrl = normalizeExternalUrl(firstValue(record, ['image_url', 'image', 'featured_image']));
    const productUrl = normalizeExternalUrl(firstValue(record, ['product_url', 'shopify_url', 'url']));

    products.push({
      id: firstValue(record, ['id', 'product_id'], slugify(latin || resolvedName)),
      name: resolvedName,
      latin,
      description,
      origin,
      badge,
      availability: parseAvailability(firstValue(record, ['availability', 'disponibilita', 'stock'])),
      shopifyHandle: handle,
      productUrl,
      imageUrl,
      imageAlt: firstValue(record, [`image_alt_${language}`, 'image_alt'], resolvedName),
      grades: buildGrades(
        firstValue(record, ['first_price', 'prima', 'price_1', 'first_choice']),
        firstValue(record, ['second_price', 'standard', 'price_2', 'second_choice']),
        firstValue(record, ['first_detail', 'prima_unit', 'unit', 'size_1']),
        firstValue(record, ['second_detail', 'standard_unit', 'size_2'])
      )
    });
  }

  const meta = records.find((record) => normalizeHeader(firstValue(record, ['row_type', 'type'])) === 'meta') || {};
  return {
    marketLabel: firstValue(meta, ['week_label', 'week', 'market_label']),
    updatedAt: firstValue(meta, ['updated_at', 'last_updated']) || null,
    validUntil: firstValue(meta, ['valid_until']) || null,
    products
  };
}

function parseLegacyKeyValueSheet(rows, language) {
  const col = languageColumn[language] ?? languageColumn.it;
  const data = {};

  rows.slice(1).forEach((row) => {
    if (!Array.isArray(row)) return;
    const key = String(row[0] ?? '').trim().toLowerCase();
    if (!key) return;
    const translated = String(row[col] ?? '').trim();
    const fallback = String(row[languageColumn.it] ?? '').trim();
    data[key] = translated || fallback;
  });

  // Discover every product index present in the sheet. Gaps are allowed: t1, t3, t9 all work.
  const indexes = [...new Set(
    Object.keys(data)
      .map((key) => key.match(/^t(\d+)-(?:nome|latin|prima|standard|attivo|id|shopify-handle|product-url|image-url)$/)?.[1])
      .filter(Boolean)
      .map(Number)
  )].sort((a, b) => a - b);

  const products = [];
  for (const i of indexes) {
    const prefix = `t${i}`;
    const name = String(data[`${prefix}-nome`] || '').trim();
    const latin = String(data[`${prefix}-latin`] || '').trim();
    if (!name && !latin) continue;
    if (!isActive(data[`${prefix}-attivo`], true)) continue;

    const resolvedName = name || latin;
    products.push({
      id: String(data[`${prefix}-id`] || slugify(latin || resolvedName)),
      name: resolvedName,
      latin,
      description: String(data[`${prefix}-desc`] || '').trim(),
      origin: String(data[`${prefix}-origin`] || '').trim(),
      badge: String(data[`${prefix}-badge`] || '').trim(),
      availability: parseAvailability(data[`${prefix}-availability`]),
      shopifyHandle: String(data[`${prefix}-shopify-handle`] || data[`${prefix}-handle`] || '').trim(),
      productUrl: normalizeExternalUrl(data[`${prefix}-product-url`]),
      imageUrl: normalizeExternalUrl(data[`${prefix}-image-url`]),
      imageAlt: String(data[`${prefix}-image-alt`] || resolvedName).trim(),
      grades: buildGrades(
        data[`${prefix}-prima`],
        data[`${prefix}-standard`],
        String(data[`${prefix}-unit`] || data[`${prefix}-prima-unit`] || '').trim(),
        String(data[`${prefix}-standard-unit`] || '').trim()
      )
    });
  }

  return {
    marketLabel: String(data['week-label'] || data['week'] || '').trim(),
    updatedAt: String(data['updated-at'] || data['last-updated'] || '').trim() || null,
    validUntil: String(data['valid-until'] || '').trim() || null,
    products
  };
}

export function parseSheetCsv(csv, language = 'it') {
  const parsed = Papa.parse(csv, {
    header: false,
    skipEmptyLines: 'greedy',
    quoteChar: '"',
    escapeChar: '"'
  });

  if (parsed.errors?.length) {
    const fatal = parsed.errors.find((error) => error.type === 'Quotes' || error.code === 'MissingQuotes');
    if (fatal) throw new Error(`CSV parse error: ${fatal.message}`);
  }

  const rows = parsed.data;
  if (!Array.isArray(rows) || rows.length < 2) throw new Error('CSV is empty or incomplete');

  const parsedSheet = looksLikeTabularSheet(rows)
    ? parseTabularSheet(rows, language)
    : parseLegacyKeyValueSheet(rows, language);

  return QuotationSchema.parse({
    ...parsedSheet,
    retrievedAt: new Date().toISOString(),
    currency: 'EUR',
    source: 'sheet'
  });
}

async function fetchApi(language) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`/api/quotations?lang=${encodeURIComponent(language)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const json = await response.json();
    return QuotationSchema.parse({ ...json, source: 'api' });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSheet(language) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const separator = SHEET_CSV_URL.includes('?') ? '&' : '?';
    const response = await fetch(`${SHEET_CSV_URL}${separator}v=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Sheet ${response.status}`);
    return parseSheetCsv(await response.text(), language);
  } finally {
    clearTimeout(timeout);
  }
}

function storageKey(language) {
  return `hot-weekly-quotation-v2:${language}`;
}

function saveCache(language, quotation) {
  try {
    localStorage.setItem(storageKey(language), JSON.stringify(quotation));
  } catch {
    // Storage can be disabled; the live experience must continue working.
  }
}

function readCache(language) {
  try {
    const raw = localStorage.getItem(storageKey(language));
    if (!raw) return null;
    return QuotationSchema.parse({ ...JSON.parse(raw), source: 'cache' });
  } catch {
    return null;
  }
}

export async function loadQuotation(language = 'it') {
  const errors = [];

  try {
    const quotation = await fetchApi(language);
    saveCache(language, quotation);
    return { quotation, degraded: false, errors };
  } catch (error) {
    errors.push(error);
  }

  try {
    const quotation = await fetchSheet(language);
    saveCache(language, quotation);
    return { quotation, degraded: false, errors };
  } catch (error) {
    errors.push(error);
  }

  const cached = readCache(language);
  if (cached) return { quotation: cached, degraded: true, errors };

  return { quotation: null, degraded: true, errors };
}
