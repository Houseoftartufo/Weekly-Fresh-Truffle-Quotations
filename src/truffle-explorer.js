import './explorer-v3.css';

const labels = {
  en: {
    view: 'View details', close: 'Close explorer', previous: 'Previous truffle', next: 'Next truffle', reserve: 'Reserve this batch',
    image: 'Image', available: 'Available this week', limited: 'Limited availability', soldOut: 'Sold out',
    origin: 'Origin', grade: 'Grade', size: 'Size', first: 'First choice', zoomIn: 'Zoom in', zoomOut: 'Zoom out'
  },
  fr: {
    view: 'Voir les détails', close: 'Fermer', previous: 'Truffe précédente', next: 'Truffe suivante', reserve: 'Réserver ce lot',
    image: 'Image', available: 'Disponible cette semaine', limited: 'Disponibilité limitée', soldOut: 'Épuisé',
    origin: 'Origine', grade: 'Qualité', size: 'Taille', first: 'Premier choix', zoomIn: 'Zoomer', zoomOut: 'Dézoomer'
  },
  nl: {
    view: 'Bekijk details', close: 'Sluiten', previous: 'Vorige truffel', next: 'Volgende truffel', reserve: 'Reserveer deze batch',
    image: 'Afbeelding', available: 'Deze week beschikbaar', limited: 'Beperkt beschikbaar', soldOut: 'Uitverkocht',
    origin: 'Herkomst', grade: 'Kwaliteit', size: 'Maat', first: 'Eerste keuze', zoomIn: 'Inzoomen', zoomOut: 'Uitzoomen'
  },
  it: {
    view: 'Vedi dettagli', close: 'Chiudi', previous: 'Tartufo precedente', next: 'Tartufo successivo', reserve: 'Prenota questo lotto',
    image: 'Immagine', available: 'Disponibile questa settimana', limited: 'Disponibilità limitata', soldOut: 'Esaurito',
    origin: 'Origine', grade: 'Qualità', size: 'Pezzatura', first: 'Prima scelta', zoomIn: 'Ingrandisci', zoomOut: 'Riduci'
  }
};

function copy(language) {
  return labels[language] || labels.en;
}

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function productImages(product) {
  const source = Array.isArray(product?.gallery) ? product.gallery : [];
  const images = source
    .map((item) => typeof item === 'string' ? { url: item, alt: product.imageAlt || product.name } : item)
    .filter((item) => item?.url);

  if (product?.imageUrl && !images.some((item) => item.url === product.imageUrl)) {
    images.unshift({ url: product.imageUrl, alt: product.imageAlt || product.name });
  }
  return images;
}

export function mediaViewLabel(language, productName) {
  return `${copy(language).view} — ${productName}`;
}

export function bindPremiumMediaMotion(media, image) {
  if (!media || !image) return;
  const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || reduceMotion) return;

  const reset = () => {
    image.style.transformOrigin = '50% 50%';
    media.style.removeProperty('--media-lift-x');
    media.style.removeProperty('--media-lift-y');
  };

  media.addEventListener('pointermove', (event) => {
    const rect = media.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    image.style.transformOrigin = `${x}% ${y}%`;
    media.style.setProperty('--media-lift-x', `${((x - 50) / 50) * -2}px`);
    media.style.setProperty('--media-lift-y', `${((y - 50) / 50) * -2}px`);
  }, { passive: true });
  media.addEventListener('pointerleave', reset, { passive: true });
}

export function createTruffleExplorer({ getProducts, getLanguage, formatCurrency, buildWhatsappMessage }) {
  const dialog = create('dialog', 'truffle-explorer');
  dialog.setAttribute('aria-modal', 'true');

  const shell = create('div', 'explorer-shell');
  const topbar = create('div', 'explorer-topbar');
  const brand = create('div', 'explorer-brand');
  const brandMark = create('span', 'explorer-brand-mark');
  brandMark.setAttribute('aria-hidden', 'true');
  brand.append(brandMark, create('span', '', 'House of Tartufo'));
  const counter = create('span', 'explorer-counter');
  const close = create('button', 'explorer-close', '×');
  close.type = 'button';
  topbar.append(brand, counter, close);

  const body = create('div', 'explorer-body');

  const panel = create('aside', 'explorer-panel');
  const eyebrow = create('p', 'explorer-eyebrow');
  const title = create('h2', 'explorer-title');
  const latin = create('p', 'explorer-latin');
  const specs = create('div', 'explorer-specs');
  const originSpec = create('div', 'explorer-spec');
  const originLabel = create('span', 'explorer-spec-label');
  const originValue = create('span', 'explorer-spec-value');
  originSpec.append(originLabel, originValue);
  const gradeSpec = create('div', 'explorer-spec');
  const gradeLabel = create('span', 'explorer-spec-label');
  const gradeValue = create('span', 'explorer-spec-value');
  gradeSpec.append(gradeLabel, gradeValue);
  const sizeSpec = create('div', 'explorer-spec');
  const sizeLabel = create('span', 'explorer-spec-label');
  const sizeValue = create('span', 'explorer-spec-value');
  sizeSpec.append(sizeLabel, sizeValue);
  specs.append(originSpec, gradeSpec, sizeSpec);

  const price = create('div', 'explorer-price');
  const availability = create('div', 'explorer-availability');
  const reserve = create('a', 'explorer-reserve');
  reserve.target = '_blank';
  reserve.rel = 'noopener noreferrer';
  panel.append(eyebrow, title, latin, specs, price, availability, reserve);

  const visual = create('div', 'explorer-visual');
  const stage = create('div', 'explorer-stage');
  const image = create('img', 'explorer-image');
  image.draggable = false;
  const prev = create('button', 'explorer-nav explorer-nav-prev', '←');
  const next = create('button', 'explorer-nav explorer-nav-next', '→');
  prev.type = next.type = 'button';

  const zoomControls = create('div', 'explorer-zoom-controls');
  const zoomOut = create('button', 'explorer-zoom-button', '−');
  const zoomIn = create('button', 'explorer-zoom-button', '+');
  zoomOut.type = zoomIn.type = 'button';
  zoomControls.append(zoomOut, zoomIn);
  stage.append(image, prev, next, zoomControls);

  const gallery = create('div', 'explorer-gallery');
  visual.append(stage, gallery);
  body.append(panel, visual);

  const footer = create('div', 'explorer-footer');
  const footerMeta = create('div', 'explorer-footer-meta');
  const footerOrigin = create('span');
  const footerGrade = create('span');
  const footerSize = create('span');
  footerMeta.append(footerOrigin, footerGrade, footerSize);
  const footerStatus = create('div', 'explorer-footer-status');
  footer.append(footerMeta, footerStatus);

  shell.append(topbar, body, footer);
  dialog.append(shell);
  document.body.append(dialog);

  let productIndex = 0;
  let imageIndex = 0;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let lastTrigger = null;
  let swipeStart = null;
  const pointers = new Map();
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  let dragStart = null;

  function products() {
    return getProducts?.() || [];
  }

  function currentProduct() {
    return products()[productIndex] || null;
  }

  function currentImages() {
    return productImages(currentProduct());
  }

  function clampZoom(value) {
    return Math.max(1, Math.min(2.6, value));
  }

  function applyTransform() {
    image.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
    stage.classList.toggle('is-zoomed', zoom > 1.01);
  }

  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function setZoom(nextZoom) {
    zoom = clampZoom(nextZoom);
    if (zoom === 1) panX = panY = 0;
    applyTransform();
  }

  function setImage(index) {
    const product = currentProduct();
    const images = productImages(product);
    if (!images.length) return;
    imageIndex = ((index % images.length) + images.length) % images.length;
    const selected = images[imageIndex];
    image.src = selected.url;
    image.alt = selected.alt || product.imageAlt || product.name;
    resetZoom();

    [...gallery.children].forEach((thumb, thumbIndex) => {
      const active = thumbIndex === imageIndex;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  function availabilityCopy(product, c) {
    if (product.availability === 'limited') return c.limited;
    if (product.availability === 'sold-out') return c.soldOut;
    return c.available;
  }

  function render() {
    const list = products();
    const product = currentProduct();
    if (!product) return;

    const language = getLanguage?.() || 'en';
    const c = copy(language);
    const images = productImages(product);
    const first = product.grades?.find((grade) => grade.id === 'first-choice') || product.grades?.[0];
    const countText = `${String(productIndex + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    const statusText = availabilityCopy(product, c);
    const statusClass = product.availability || 'available';

    counter.textContent = countText;
    eyebrow.textContent = countText;
    close.setAttribute('aria-label', c.close);
    prev.setAttribute('aria-label', c.previous);
    next.setAttribute('aria-label', c.next);
    zoomIn.setAttribute('aria-label', c.zoomIn);
    zoomOut.setAttribute('aria-label', c.zoomOut);
    prev.hidden = next.hidden = list.length <= 1;

    title.textContent = product.name;
    latin.textContent = product.latin || '';
    originLabel.textContent = c.origin;
    originValue.textContent = product.origin || '—';
    gradeLabel.textContent = c.grade;
    gradeValue.textContent = c.first;
    sizeLabel.textContent = c.size;
    sizeValue.textContent = first?.detail || '—';

    price.replaceChildren();
    if (first?.amount == null) {
      price.textContent = '—';
    } else {
      price.append(document.createTextNode(formatCurrency(first.amount, language)));
      price.append(create('small', '', '/ KG'));
    }

    availability.className = `explorer-availability is-${statusClass}`;
    availability.textContent = `● ${statusText}`;
    reserve.textContent = `${c.reserve} →`;
    reserve.href = `https://wa.me/32480205715?text=${encodeURIComponent(buildWhatsappMessage(product))}`;

    gallery.replaceChildren();
    images.forEach((item, index) => {
      const thumb = create('button', 'explorer-dot explorer-thumb');
      thumb.type = 'button';
      thumb.setAttribute('aria-label', `${c.image} ${index + 1} / ${images.length}`);
      const thumbImage = create('img', 'explorer-thumb-image');
      thumbImage.src = item.url;
      thumbImage.alt = '';
      thumbImage.loading = 'lazy';
      thumbImage.decoding = 'async';
      thumb.append(thumbImage);
      thumb.addEventListener('click', () => setImage(index));
      gallery.append(thumb);
    });
    gallery.hidden = images.length === 0;

    footerOrigin.textContent = product.origin || '—';
    footerGrade.textContent = c.first;
    footerSize.textContent = first?.detail || '—';
    footerStatus.className = `explorer-footer-status is-${statusClass}`;
    footerStatus.textContent = statusText;

    if (images.length) {
      image.hidden = false;
      setImage(Math.min(imageIndex, images.length - 1));
    } else {
      image.hidden = true;
      image.removeAttribute('src');
      resetZoom();
    }
  }

  function navigateProduct(direction) {
    const list = products();
    if (list.length <= 1) return;
    productIndex = (productIndex + direction + list.length) % list.length;
    imageIndex = 0;
    render();
  }

  function navigateImage(direction) {
    const images = currentImages();
    if (images.length > 1) {
      setImage(imageIndex + direction);
      return;
    }
    navigateProduct(direction);
  }

  function open(index = 0, trigger = document.activeElement) {
    const list = products();
    if (!list.length) return;
    productIndex = Math.max(0, Math.min(index, list.length - 1));
    imageIndex = 0;
    lastTrigger = trigger;
    render();
    document.body.classList.add('explorer-open');
    if (!dialog.open) dialog.showModal();
    close.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  close.addEventListener('click', closeDialog);
  prev.addEventListener('click', () => navigateProduct(-1));
  next.addEventListener('click', () => navigateProduct(1));
  zoomIn.addEventListener('click', () => setZoom(zoom + .35));
  zoomOut.addEventListener('click', () => setZoom(zoom - .35));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('explorer-open');
    resetZoom();
    lastTrigger?.focus?.({ preventScroll: true });
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateProduct(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateProduct(1);
    }
  });

  stage.addEventListener('wheel', (event) => {
    if (!dialog.open || image.hidden) return;
    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? .14 : -.14));
  }, { passive: false });

  stage.addEventListener('dblclick', (event) => {
    if (image.hidden) return;
    event.preventDefault();
    setZoom(zoom > 1.1 ? 1 : 2);
  });

  stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture?.(event.pointerId);

    if (pointers.size === 1) {
      swipeStart = { x: event.clientX, y: event.clientY, time: performance.now() };
      dragStart = { x: event.clientX, y: event.clientY, panX, panY };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStartDistance = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartZoom = zoom;
      swipeStart = null;
    }
  });

  stage.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStartDistance > 0) setZoom(pinchStartZoom * (distance / pinchStartDistance));
    } else if (pointers.size === 1 && zoom > 1.01 && dragStart) {
      panX = dragStart.panX + (event.clientX - dragStart.x);
      panY = dragStart.panY + (event.clientY - dragStart.y);
      applyTransform();
      swipeStart = null;
    }
  });

  function endPointer(event) {
    const wasSingle = pointers.size === 1;
    pointers.delete(event.pointerId);
    if (wasSingle && swipeStart && zoom <= 1.01) {
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      const duration = performance.now() - swipeStart.time;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.25 && duration < 700) {
        navigateImage(dx < 0 ? 1 : -1);
      }
    }
    if (pointers.size < 2) pinchStartDistance = 0;
    swipeStart = null;
    dragStart = null;
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  return {
    open,
    close: closeDialog,
    sync() {
      if (dialog.open) render();
    }
  };
}
