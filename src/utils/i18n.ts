import { ref, reactive } from 'vue';

export const LOCALE_OPTIONS = [
  { content: '简体中文', value: 'zh_CN' },
  { content: '繁體中文', value: 'zh_TW' },
  { content: 'English', value: 'en' },
  { content: '日本語', value: 'ja' }
];

const currentLocale = ref('zh_CN');
const messages = reactive<Record<string, any>>({});

export const getCurrentLocale = () => currentLocale.value;

export const setLocale = async (locale: string) => {
  try {
    // Chrome extension environment
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    const data = await response.json();

    // Clear and update messages
    Object.keys(messages).forEach(key => delete messages[key]);
    Object.assign(messages, data);

    currentLocale.value = locale;
    localStorage.setItem('app_locale', locale);
  } catch (e) {
    console.error(`Failed to load locale: ${locale}`, e);
    // Fallback to chrome.i18n if fetch fails (though this shouldn't happen in extension)
  }
};

export function t(key: string, substitutions?: string | string[]): string {
  const msg = messages[key];
  let message = msg ? msg.message : '';

  // Fallback to chrome.i18n if message not found in loaded locale
  if (!message && typeof chrome !== 'undefined' && chrome.i18n) {
    message = chrome.i18n.getMessage(key, substitutions) || key;
  }

  if (!message) return key;

  if (substitutions) {
    const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
    subs.forEach((sub, index) => {
      message = message.replace(`$${index + 1}`, sub);
    });
  }

  return message;
}

// Initialize
const initI18n = () => {
  const savedLocale = localStorage.getItem('app_locale');
  let defaultLocale = 'zh_CN';

  if (savedLocale) {
    defaultLocale = savedLocale;
  } else if (typeof chrome !== 'undefined' && chrome.i18n) {
    const uiLang = chrome.i18n.getUILanguage().replace('-', '_');
    // Simple matching for zh-CN, zh-TW, en, ja
    if (uiLang.startsWith('zh')) {
      defaultLocale = uiLang.includes('TW') || uiLang.includes('HK') ? 'zh_TW' : 'zh_CN';
    } else if (uiLang.startsWith('en')) {
      defaultLocale = 'en';
    } else if (uiLang.startsWith('ja')) {
      defaultLocale = 'ja';
    }
  }

  setLocale(defaultLocale);
};

initI18n();
