import { loadQuotation } from './data.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, resolveLanguage, t } from './i18n.js';
import './product-images.css';

const state = {
  language: DEFAULT_LANGUAGE,
  quotation: null,
  requestId: 0
};

const grid = document.querySelector('[data-product-grid]');
const statusText = document.querySelector('[data-status-text]');
const validityEl = document.querySelector('[data-validity]');
const headerUpdated = document.querySelector('[data-header-updated]');
const errorBanner = document.querySelector('[data-error]');
const errorText = document.querySelector('[data-error-text]');
const toast = document.querySelector('[data-toast]');

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
  document.title = {
    it: 'House of Tartufo — Quotazioni Settimanali',
    en: 'House of Tartufo — Weekly Fresh Truffle Quotations',
    fr: 'House of Tartufo — Cotations Hebdomadaires',
    nl: 'House of Tartufo — Wekelijkse Truffelprijzen'
  }[language] || 'House of Tartufo — Weekly Fresh Truffle Quotations';
  updateGeneralWhatsapp();
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

function buildWhatsappMessage(product) {
  const language = state.language;
  const first = product.grades.find((grade) => grade.id === 'first-choice') ?? product.grades[0];
  const price = first?.amount == null ? t(language, 'product.noPrice') : `${formatCurrency(first.amount, language)}/kg`;
  const messages = {
    it: `Buongiorno House of Tartufo, sono interessato alla quotazione di questa settimana per ${product.name} (${product.latin || 'tartufo fresco'}) — ${price}. Quantità: ___ kg. Destinazione: ___.`,
    en: `Hello House of Tartufo, I am interested in this week's quotation for ${product.name} (${product.latin || 'fresh truffle'}) — ${price}. Quantity: ___ kg. Destination: ___.`,
    fr: `Bonjour House of Tartufo, je suis intéressé par la cotation de cette semaine pour ${product.name} (${product.latin || 'truffe fraîche'}) — ${price}. Quantité : ___ kg. Destination : ___.`,
    nl: `Hallo House of Tartufo, ik ben geïnteresseerd in de notering van deze week voor ${product.name} (${product.latin || 'verse truffel'}) — ${price}. Hoeveelheid: ___ kg. Bestemming: ___.`
  };
  return messages[language] || messages.en;
}

function buildProductMedia(product) {
  if (!product.imageUrl) return null;
  const media = create(product.productUrl ? 'a' : 'div', 'product-media');
  if (product.productUrl) {
    media.href = product.productUrl;
    media.target = '_blank';
    media.rel = 'noopener noreferrer';
    media.setAttribute('aria-label', `${product.name} — House of Tartufo`);
  }

  const image = create('img', 'product-image');
  image.src = product.imageUrl;
  image.alt = product.imageAlt || product.name;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer-when-downgrade';
  image.addEventListener('error', () => media.remove(), { once: true });
  media.append(image);
  return media;
}

function buildProductCard(product) {
  const article = create('article', 'product-card');
  article.id = `product-${product.id}`;
  if (product.imageUrl) article.classList.add('has-image');

  const media = buildProductMedia(product);
  const content = create('div', 'product-card-content');

  const top = create('div', 'product-top');
  const badge = create('span', 'product-badge', product.badge || t(state.language, 'product.selected'));
  const origin = create('span', 'product-origin', product.origin || t(state.language, 'product.origin'));
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
  const availabilityLabel = {
    available: 'product.available',
    limited: 'product.limited',
    'sold-out': 'product.soldOut'
  }[product.availability] || 'product.available';
  availability.append(availabilityDot, document.createTextNode(t(state.language, availabilityLabel)));

  content.append(top, title, latin, description, grades, actions, availability);
  if (media) article.append(media);
  article.append(content);
  return article;
}

function renderProducts(quotation) {
  grid.replaceChildren();
  const count = quotation.products.length;
  grid.dataset.count = count <= 1 ? '1' : count === 2 ? '2' : count === 3 ? '3' : 'many';
  quotation.products.forEach((product) => grid.append(buildProductCard(product)));
  grid.setAttribute('aria-busy', 'false');
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
  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'false');
  const empty = create('div', 'notice notice-error', t(state.language, 'error.empty'));
  grid.append(empty);
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
}

function updateGeneralWhatsapp() {
  const messages = {
    it: 'Buongiorno House of Tartufo, vorrei informazioni sulla quotazione dei tartufi freschi di questa settimana.',
    en: "Hello House of Tartufo, I would like information about this week's fresh truffle quotation.",
    fr: 'Bonjour House of Tartufo, je voudrais des informations sur la cotation des truffes fraîches de cette semaine.',
    nl: 'Hallo House of Tartufo, ik wil graag informatie over de verse truffelnotering van deze week.'
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

  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}

async function init() {
  state.language = resolveLanguage();
  applyTranslations(state.language);
  bindEvents();
  await refreshQuotation();
}

init();
