export const SUPPORTED_LANGUAGES = ['en', 'fr', 'nl', 'it'];
export const DEFAULT_LANGUAGE = 'en';

export function resolveLanguage() {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (SUPPORTED_LANGUAGES.includes(fromUrl)) return fromUrl;

  try {
    const saved = localStorage.getItem('hot-quotation-language');
    if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
  } catch {
    // Private browsing/storage restrictions must not affect language selection.
  }

  const browser = navigator.language?.slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(browser) ? browser : DEFAULT_LANGUAGE;
}
