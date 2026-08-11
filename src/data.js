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
const truthy = new Set(['si', 'sì', 'yes', 'oui', 'ja', '1', 'true']);

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
    .replace(/^-|-$/g, '') || `product-${Date.now()}`;
}

function parseAvailability(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['sold out', 'sold-out', 'esaurito', 'épuisé', 'uitverkocht', 'no', '0', 'false'].includes(v)) return 'sold-out';
  if (['limited', 'limitato', 'limitata', 'limité', 'beperkt'].includes(v)) return 'limited';
  return 'available';
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

  const products = [];
  for (let i = 1; i <= 50; i += 1) {
    const prefix = `t${i}`;
    const name = String(data[`${prefix}-nome`] || '').trim();
    const activeRaw = String(data[`${prefix}-attivo`] || 'si').trim().toLowerCase();

    if (!name && i > 8) break;
    if (!name || !truthy.has(activeRaw)) continue;

    const firstAmount = parsePrice(data[`${prefix}-prima`]);
    const secondAmount = parsePrice(data[`${prefix}-standard`]);
    const firstDetail = String(data[`${prefix}-unit`] || data[`${prefix}-prima-unit`] || '').trim();
    const secondDetail = String(data[`${prefix}-standard-unit`] || '').trim();

    const grades = [];
    if (firstAmount !== null || data[`${prefix}-prima`]) {
      grades.push({ id: 'first-choice', labelKey: 'product.first', detail: firstDetail, amount: firstAmount });
    }
    if (secondAmount !== null || data[`${prefix}-standard`]) {
      grades.push({ id: 'second-choice', labelKey: 'product.second', detail: secondDetail, amount: secondAmount });
    }
    if (!grades.length) grades.push({ id: 'first-choice', labelKey: 'product.first', detail: firstDetail, amount: null });

    products.push({
      id: String(data[`${prefix}-id`] || slugify(data[`${prefix}-latin`] || name)),
      name,
      latin: String(data[`${prefix}-latin`] || '').trim(),
      description: String(data[`${prefix}-desc`] || '').trim(),
      origin: String(data[`${prefix}-origin`] || '').trim(),
      badge: String(data[`${prefix}-badge`] || '').trim(),
      availability: parseAvailability(data[`${prefix}-availability`]),
      grades
    });
  }

  return QuotationSchema.parse({
    marketLabel: String(data['week-label'] || data['week'] || '').trim(),
    updatedAt: String(data['updated-at'] || data['last-updated'] || '').trim() || null,
    validUntil: String(data['valid-until'] || '').trim() || null,
    retrievedAt: new Date().toISOString(),
    currency: 'EUR',
    products,
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
