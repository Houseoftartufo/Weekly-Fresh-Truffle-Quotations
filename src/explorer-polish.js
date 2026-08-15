const explorerCopy = {
  en: { cta: 'Request quotation', hint: 'Drag to explore', live: 'Live weekly quotation' },
  fr: { cta: 'Demander un devis', hint: 'Glisser pour explorer', live: 'Cotisation hebdomadaire en direct' },
  nl: { cta: 'Offerte aanvragen', hint: 'Sleep om te verkennen', live: 'Live wekelijkse offerte' },
  it: { cta: 'Richiedi preventivo', hint: 'Trascina per esplorare', live: 'Quotazione settimanale live' }
};

function language() {
  const active = document.querySelector('.lang-button.is-active')?.dataset?.lang;
  const htmlLang = document.documentElement.lang?.slice(0, 2).toLowerCase();
  return active || htmlLang || 'en';
}

function copy() {
  return explorerCopy[language()] || explorerCopy.en;
}

function setText(element, value) {
  if (element && element.textContent !== value) element.textContent = value;
}

function installBrand(explorer) {
  const brand = explorer.querySelector('.explorer-brand');
  if (!brand || brand.querySelector('.explorer-brand-logo')) return;

  const image = document.createElement('img');
  image.className = 'explorer-brand-logo';
  image.src = '/assets/house-of-tartufo-logo-white-v2.svg';
  image.alt = 'House of Tartufo';
  image.width = 943;
  image.height = 265;
  image.decoding = 'async';
  brand.replaceChildren(image);
}

function installHint(explorer) {
  const stage = explorer.querySelector('.explorer-stage');
  if (!stage || stage.querySelector('.explorer-interaction-hint')) return;

  const hint = document.createElement('span');
  hint.className = 'explorer-interaction-hint';
  hint.setAttribute('aria-hidden', 'true');
  stage.append(hint);

  const dismiss = () => stage.classList.add('has-interacted');
  stage.addEventListener('pointerdown', dismiss, { passive: true });
  stage.addEventListener('wheel', dismiss, { passive: true });
  stage.addEventListener('dblclick', dismiss, { passive: true });
  explorer.querySelector('.explorer-zoom-controls')?.addEventListener('click', dismiss);

  explorer.addEventListener('close', () => {
    stage.classList.remove('has-interacted');
  });
}

function refresh(explorer) {
  const c = copy();
  const title = explorer.querySelector('.explorer-title')?.textContent?.trim() || '';

  const originRow = explorer.querySelector('.explorer-specs .explorer-spec:first-child');
  const originValue = originRow?.querySelector('.explorer-spec-value')?.textContent?.trim();
  if (originRow) originRow.hidden = !originValue || originValue === '—';

  const reserve = explorer.querySelector('.explorer-reserve');
  setText(reserve, `${c.cta} →`);
  if (reserve) reserve.setAttribute('aria-label', title ? `${c.cta} — ${title}` : c.cta);

  setText(explorer.querySelector('.explorer-interaction-hint'), c.hint);

  const footerStatus = explorer.querySelector('.explorer-footer-status');
  if (footerStatus) {
    footerStatus.className = 'explorer-footer-status is-live';
    setText(footerStatus, c.live);
  }
}

function mount(explorer) {
  if (!explorer || explorer.dataset.polished === 'true') return;
  explorer.dataset.polished = 'true';

  installBrand(explorer);
  installHint(explorer);
  refresh(explorer);

  let scheduled = false;
  const scheduleRefresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refresh(explorer);
    });
  };

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(explorer, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['open']
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('.lang-button')) setTimeout(scheduleRefresh, 0);
  });
}

function boot() {
  const existing = document.querySelector('.truffle-explorer');
  if (existing) {
    mount(existing);
    return;
  }

  const observer = new MutationObserver(() => {
    const explorer = document.querySelector('.truffle-explorer');
    if (!explorer) return;
    observer.disconnect();
    mount(explorer);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
