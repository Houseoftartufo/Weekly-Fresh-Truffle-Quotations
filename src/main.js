import { loadQuotation } from './data.js';
import { t } from './i18n.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, resolveLanguage } from './language.js';
import { bindPremiumMediaMotion, createTruffleExplorer, mediaViewLabel } from './truffle-explorer.js';
import './product-images.css';
import './landing-v3.css';
import './explorer-v3.css';

const state = {
  language: DEFAULT_LANGUAGE,
  quotation: null,
  displayProducts: [],
  requestId: 0
};

const grid = document.querySelector('[data-product-grid]');
const statusText = document.querySelector('[data-status-text]');
const validityEl = document.querySelector('[data-validity]');
const headerUpdated = document.querySelector('[data-header-updated]');
const errorBanner = document.querySelector('[data-error]');
const errorText = document.querySelector('[data-error-text]');
const toast = document.querySelector('[data-toast]');
const heroVisual = document.querySelector('[data-hero-visual]');
const heroImage = document.querySelector('[data-hero-image]');
const heroName = document.querySelector('[data-hero-name]');
const heroLatin = document.querySelector('[data-hero-latin]');
const heroOpen = document.querySelector('[data-hero-open]');
const finalVisual = document.querySelector('[data-final-visual]');
const finalImage = document.querySelector('[data-final-image]');
const marketState = document.querySelector('[data-market-state]');
const marketOrigin = document.querySelector('[data-market-origin]');
const marketProduct = document.querySelector('[data-market-product]');
const marketAvailability = document.querySelector('[data-market-availability]');
const marketCount = document.querySelector('[data-market-count]');
let explorer = null;

const v3Copy = {
  en: {
    'nav.weekly': 'Weekly quotations',
    'nav.truffles': 'Our truffles',
    'nav.shipping': 'Shipping',
    'hero.professionals': 'Built for chefs, restaurants, retailers and purchasing teams.',
    'hero.inspect': 'View details',
    'market.update': 'Market update',
    'market.origin': 'Origin',
    'market.availability': 'Availability',
    'market.validity': 'Validity',
    'market.currency': 'Currency',
    'market.livePrice': 'Live weekly quotation',
    'market.perKg': 'Prices per kg',
    'quotation.dynamic': 'The selection adapts automatically to what is available this week.',
    live: 'LIVE',
    cached: 'CONFIRMED',
    available: 'GOOD',
    limited: 'LIMITED',
    soldOut: 'SOLD OUT',
    oneProduct: '1 variety available',
    products: (count) => `${count} varieties available`
  },
  fr: {
    'nav.weekly': 'Cotations',
    'nav.truffles': 'Nos truffes',
    'nav.shipping': 'Livraison',
    'hero.professionals': 'Pensé pour chefs, restaurants, revendeurs et équipes achats.',
    'hero.inspect': 'Voir les détails',
    'market.update': 'Marché',
    'market.origin': 'Origine',
    'market.availability': 'Disponibilité',
    'market.validity': 'Validité',
    'market.currency': 'Devise',
    'market.livePrice': 'Cotation hebdomadaire',
    'market.perKg': 'Prix au kg',
    'quotation.dynamic': 'La sélection s’adapte automatiquement aux produits disponibles cette semaine.',
    live: 'EN DIRECT',
    cached: 'CONFIRMÉE',
    available: 'BONNE',
    limited: 'LIMITÉE',
    soldOut: 'ÉPUISÉ',
    oneProduct: '1 variété disponible',
    products: (count) => `${count} variétés disponibles`
  },
  nl: {
    'nav.weekly': 'Weekprijzen',
    'nav.truffles': 'Onze truffels',
    'nav.shipping': 'Verzending',
    'hero.professionals': 'Gebouwd voor chefs, restaurants, retailers en inkoopteams.',
    'hero.inspect': 'Bekijk details',
    'market.update': 'Marktupdate',
    'market.origin': 'Herkomst',
    'market.availability': 'Beschikbaarheid',
    'market.validity': 'Geldigheid',
    'market.currency': 'Valuta',
    'market.livePrice': 'Wekelijkse notering',
    'market.perKg': 'Prijzen per kg',
    'quotation.dynamic': 'De selectie past zich automatisch aan aan wat deze week beschikbaar is.',
    live: 'LIVE',
    cached: 'BEVESTIGD',
    available: 'GOED',
    limited: 'BEPERKT',
    soldOut: 'UITVERKOCHT',
    oneProduct: '1 variëteit beschikbaar',
    products: (count) => `${count} variëteiten beschikbaar`
  },
  it: {
    'nav.weekly': 'Quotazioni',
    'nav.truffles': 'I nostri tartufi',
    'nav.shipping': 'Spedizione',
    'hero.professionals': 'Pensato per chef, ristoranti, retailer e team acquisti.',
    'hero.inspect': 'Vedi dettagli',
    'market.update': 'Mercato',
    'market.origin': 'Origine',
    'market.availability': 'Disponibilità',
    'market.validity': 'Validità',
    'market.currency': 'Valuta',
    'market.livePrice': 'Quotazione settimanale',
    'market.perKg': 'Prezzi al kg',
    'quotation.dynamic': 'La selezione si adatta automaticamente a ciò che è disponibile questa settimana.',
    live: 'LIVE',
    cached: 'CONFERMATA',
    available: 'BUONA',
    limited: 'LIMITATA',
    soldOut: 'ESAURITO',
    oneProduct: '1 varietà disponibile',
    products: (count) => `${count} varietà disponibili`
  }
};

function v3(language = state.language) {
  return v3Copy[language] || v3Copy.en;
}

function applyV3Translations(language) {
  const dictionary = v3(language);
  document.querySelectorAll('[data-v3-i18n]').forEach((element) => {
    const value = dictionary[element.dataset.v3I18n];
    if (typeof value === 'string') element.textContent = value;
  });
}

function applyTranslations(language) {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(language, element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((element) => {
    // HTML is only read from our static internal dictionary, never from the Sheet.
    element.innerHTML = t(language, element.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-lang]').forEach((button) => {
    const active = button.dataset.lang === language;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  applyV3Translations(language);
  document.title = {
    en: 'House of Tartufo — Weekly Fresh Truffle Quotations',
    fr: 'House of Tartufo — Cotations Hebdomadaires',
    nl: 'House of Tartufo — Wekelijkse Truffelprijzen',
    it: 'House of Tartufo — Quotazioni Settimanali'
  }[language] || 'House of Tartufo — Weekly Fresh Truffle Quotations';
  updateGeneralWhatsapp();
  explorer?.sync();
}

function formatCurrency(amount, language) {
  if (amount === null || amount === undefined) return t(language, 'product.noPrice');
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
  }).format(amount);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, language) {
  const parsed = parseDate(value);
  if (!parsed) return value || '—';
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: value.includes('T') ? '2-digit' : undefined,
    minute: value.includes('T') ? '2-digit' : undefined
  }).format(parsed);
}

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function availabilityLabelKey(product) {
  return {
    available: 'product.available',
    limited: 'product.limited',
    'sold-out': 'product.soldOut'
  }[product?.availability] || 'product.available';
}

function buildWhatsappMessage(product) {
  const language = state.language;
  const first = product.grades.find((grade) => grade.id === 'first-choice') ?? product.grades[0];
  const price = first?.amount == null ? t(language, 'product.noPrice') : `${formatCurrency(first.amount, language)}/kg`;
  const messages = {
    en: `Hello House of Tartufo, I am interested in this week's quotation for ${product.name} (${product.latin || 'fresh truffle'}) — ${price}. Quantity: ___ kg. Destination: ___.`,
    fr: `Bonjour House of Tartufo, je suis intéressé par la cotation de cette semaine pour ${product.name} (${product.latin || 'truffe fraîche'}) — ${price}. Quantité : ___ kg. Destination : ___.`,
    nl: `Hallo House of Tartufo, ik ben geïnteresseerd in de notering van deze week voor ${product.name} (${product.latin || 'verse truffel'}) — ${price}. Hoeveelheid: ___ kg. Bestemming: ___.`,
    it: `Buongiorno House of Tartufo, sono interessato alla quotazione di questa settimana per ${product.name} (${product.latin || 'tartufo fresco'}) — ${price}. Quantità: ___ kg. Destinazione: ___.`
  };
  return messages[language] || messages.en;
}

function primaryImage(product) {
  return product?.imageUrl || product?.gallery?.find((item) => item?.url)?.url || null;
}

function buildProductMedia(product, index) {
  const imageUrl = primaryImage(product);
  if (!imageUrl) return null;

  const media = create('button', 'product-media');
  media.type = 'button';
  media.setAttribute('aria-label', mediaViewLabel(state.language, product.name));

  const image = create('img', 'product-image');
  image.src = imageUrl;
  image.alt = product.imageAlt || product.gallery?.[0]?.alt || product.name;
  image.loading = index === 0 ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer-when-downgrade';
  if (index === 0) image.fetchPriority = 'high';

  const hint = create('span', 'product-media-hint', mediaViewLabel(state.language, product.name).split(' — ')[0]);
  hint.setAttribute('aria-hidden', 'true');

  image.addEventListener('error', () => media.remove(), { once: true });
  media.addEventListener('click', () => explorer?.open(index, media));
  media.append(image, hint);
  bindPremiumMediaMotion(media, image);
  return media;
}

function buildProductCard(product, index) {
  const article = create('article', 'product-card');
  article.id = `product-${product.id}`;
  if (primaryImage(product)) article.classList.add('has-image');
  if (product.featured || index === 0) article.classList.add('is-featured');

  const media = buildProductMedia(product, index);
  const content = create('div', 'product-card-content');

  const top = create('div', 'product-top');
  const badge = create('span', 'product-badge', product.badge || t(state.language, 'product.selected'));
  const origin = create('span', 'product-origin', product.origin || '—');
  top.append(badge, origin);

  const title = create('h3', 'product-name', product.name);
  const latin = create('p', 'product-latin', product.latin);
  const description = create('p', 'product-description', product.description);

  const grades = create('div', 'grades');
  product.grades.forEach((grade) => {
    const row = create('div', 'grade');
    const info = create('div');
    info.append(
      create('span', 'grade-label', t(state.language, grade.labelKey)),
      create('span', 'grade-detail', grade.detail || '')
    );

    const price = create('div', 'price');
    if (grade.amount === null) {
      price.textContent = t(state.language, 'product.noPrice');
    } else {
      price.append(document.createTextNode(formatCurrency(grade.amount, state.language)));
      price.append(create('small', '', '/ kg'));
    }
    row.append(info, price);
    grades.append(row);
  });

  const actions = create('div', 'product-actions');
  const order = create('a', 'button button-primary', t(state.language, 'product.order'));
  order.href = product.productUrl || `https://houseoftartufo.com/search?q=${encodeURIComponent(product.latin || product.name)}`;
  order.target = '_blank';
  order.rel = 'noopener noreferrer';
  order.setAttribute('aria-label', `${t(state.language, 'product.order')} — ${product.name}`);

  const whatsapp = create('a', 'button button-ghost', t(state.language, 'product.ask'));
  whatsapp.href = `https://wa.me/32480205715?text=${encodeURIComponent(buildWhatsappMessage(product))}`;
  whatsapp.target = '_blank';
  whatsapp.rel = 'noopener noreferrer';
  whatsapp.setAttribute('aria-label', `${t(state.language, 'product.ask')} — ${product.name}`);
  actions.append(order, whatsapp);

  const availability = create('div', `availability is-${product.availability}`);
  const availabilityDot = create('span', 'availability-dot');
  availabilityDot.setAttribute('aria-hidden', 'true');
  availability.append(availabilityDot, document.createTextNode(t(state.language, availabilityLabelKey(product))));

  content.append(top, title, latin, description, grades, actions, availability);
  if (media) article.append(media);
  article.append(content);
  return article;
}

function renderProducts(quotation) {
  grid.replaceChildren();
  state.displayProducts = [...quotation.products].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const count = state.displayProducts.length;
  grid.dataset.count = count <= 1 ? '1' : count === 2 ? '2' : count === 3 ? '3' : 'many';
  state.displayProducts.forEach((product, index) => grid.append(buildProductCard(product, index)));
  grid.setAttribute('aria-busy', 'false');
  explorer?.sync();
}

function setDynamicImage({ wrapper, image, url, alt }) {
  if (!wrapper || !image) return;
  if (!url) {
    wrapper.hidden = true;
    image.removeAttribute('src');
    image.alt = '';
    return;
  }
  wrapper.hidden = false;
  image.src = url;
  image.alt = alt || '';
}

function renderV3Stage(quotation, degraded) {
  const product = state.displayProducts[0] || quotation.products?.[0] || null;
  const dictionary = v3();
  const imageUrl = primaryImage(product);
  const finalUrl = product?.gallery?.find((item, index) => index > 0 && item?.url)?.url || imageUrl;

  setDynamicImage({
    wrapper: heroVisual,
    image: heroImage,
    url: imageUrl,
    alt: product?.imageAlt || product?.name || ''
  });
  if (heroName) heroName.textContent = product?.name || '—';
  if (heroLatin) heroLatin.textContent = product?.latin || '';
  if (heroOpen) heroOpen.setAttribute('aria-label', product ? mediaViewLabel(state.language, product.name) : dictionary['hero.inspect']);

  setDynamicImage({
    wrapper: finalVisual,
    image: finalImage,
    url: finalUrl,
    alt: product?.imageAlt || product?.name || ''
  });

  if (marketState) marketState.textContent = degraded ? dictionary.cached : dictionary.live;
  if (marketOrigin) marketOrigin.textContent = product?.origin || '—';
  if (marketProduct) marketProduct.textContent = product?.latin || product?.name || '—';

  if (marketAvailability) {
    const status = product?.availability || 'available';
    marketAvailability.className = `market-availability is-${status}`;
    marketAvailability.textContent = status === 'limited'
      ? dictionary.limited
      : status === 'sold-out'
        ? dictionary.soldOut
        : dictionary.available;
  }

  if (marketCount) {
    const count = state.displayProducts.length;
    marketCount.textContent = count === 1 ? dictionary.oneProduct : dictionary.products(count);
  }
}

function clearV3Stage() {
  setDynamicImage({ wrapper: heroVisual, image: heroImage, url: null, alt: '' });
  setDynamicImage({ wrapper: finalVisual, image: finalImage, url: null, alt: '' });
  if (heroName) heroName.textContent = '—';
  if (heroLatin) heroLatin.textContent = '';
  if (marketState) marketState.textContent = '—';
  if (marketOrigin) marketOrigin.textContent = '—';
  if (marketProduct) marketProduct.textContent = '—';
  if (marketAvailability) marketAvailability.textContent = '—';
  if (marketCount) marketCount.textContent = '—';
}

function renderSkeleton() {
  grid.setAttribute('aria-busy', 'true');
  grid.dataset.count = '3';
  grid.replaceChildren();
  for (let i = 0; i < 3; i += 1) {
    const skeleton = create('article', 'product-card product-card-skeleton');
    skeleton.setAttribute('aria-hidden', 'true');
    grid.append(skeleton);
  }
}

function showEmptyState() {
  state.displayProducts = [];
  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'false');
  const empty = create('div', 'notice notice-error', t(state.language, 'error.empty'));
  grid.append(empty);
  clearV3Stage();
}

function renderMeta(quotation, degraded) {
  const dateValue = quotation.updatedAt || quotation.retrievedAt;
  const labelKey = quotation.updatedAt ? 'date.updated' : 'date.retrieved';
  const formatted = formatDate(dateValue, state.language);
  const status = degraded ? t(state.language, 'status.cached') : t(state.language, 'status.live');

  statusText.textContent = status;
  headerUpdated.textContent = `${t(state.language, labelKey)} ${formatted}`;
  validityEl.textContent = quotation.validUntil
    ? formatDate(quotation.validUntil, state.language)
    : quotation.marketLabel || '—';
}

async function refreshQuotation() {
  const requestId = ++state.requestId;
  renderSkeleton();
  errorBanner.hidden = true;
  statusText.textContent = t(state.language, 'status.loading');

  const { quotation, degraded } = await loadQuotation(state.language);
  if (requestId !== state.requestId) return;

  if (!quotation) {
    state.quotation = null;
    errorBanner.hidden = false;
    errorText.textContent = t(state.language, 'error.empty');
    statusText.textContent = t(state.language, 'error.empty');
    headerUpdated.textContent = '—';
    validityEl.textContent = '—';
    showEmptyState();
    return;
  }

  state.quotation = quotation;
  if (degraded) {
    errorBanner.hidden = false;
    errorText.textContent = t(state.language, 'error.fallback');
  }
  renderProducts(quotation);
  renderMeta(quotation, degraded);
  renderV3Stage(quotation, degraded);
}

function updateGeneralWhatsapp() {
  const messages = {
    en: "Hello House of Tartufo, I would like information about this week's fresh truffle quotation.",
    fr: 'Bonjour House of Tartufo, je voudrais des informations sur la cotation des truffes fraîches de cette semaine.',
    nl: 'Hallo House of Tartufo, ik wil graag informatie over de verse truffelnotering van deze week.',
    it: 'Buongiorno House of Tartufo, vorrei informazioni sulla quotazione dei tartufi freschi di questa settimana.'
  };
  document.querySelectorAll('[data-whatsapp-general]').forEach((link) => {
    link.href = `https://wa.me/32480205715?text=${encodeURIComponent(messages[state.language] || messages.en)}`;
  });
}

async function changeLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) return;
  state.language = language;
  try { localStorage.setItem('hot-quotation-language', language); } catch {}

  const url = new URL(window.location.href);
  url.searchParams.set('lang', language);
  history.replaceState({}, '', url);

  applyTranslations(language);
  await refreshQuotation();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => { toast.hidden = true; }, 2200);
}

function bindEvents() {
  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => changeLanguage(button.dataset.lang));
  });

  document.querySelector('[data-copy-link]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(t(state.language, 'quotation.copied'));
    } catch {
      const input = document.createElement('textarea');
      input.value = window.location.href;
      document.body.append(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      showToast(t(state.language, 'quotation.copied'));
    }
  });

  heroOpen?.addEventListener('click', () => explorer?.open(0, heroOpen));
  heroImage?.addEventListener('error', () => { if (heroVisual) heroVisual.hidden = true; });
  finalImage?.addEventListener('error', () => { if (finalVisual) finalVisual.hidden = true; });

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}

async function init() {
  state.language = resolveLanguage();
  explorer = createTruffleExplorer({
    getProducts: () => state.displayProducts,
    getLanguage: () => state.language,
    formatCurrency,
    buildWhatsappMessage
  });
  applyTranslations(state.language);
  bindEvents();
  await refreshQuotation();
}

init();
