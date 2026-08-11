import { parseSheetCsv, SHEET_CSV_URL } from '../src/data.js';

const SUPPORTED = new Set(['it', 'en', 'fr', 'nl']);
const CACHE_TTL_MS = 10 * 60 * 1000;
const memoryCache = new Map();

function getCached(language) {
  const entry = memoryCache.get(language);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) return null;
  return entry.quotation;
}

function saveCached(language, quotation) {
  memoryCache.set(language, { quotation, savedAt: Date.now() });
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
