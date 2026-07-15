(function initializePCSI18n() {
  "use strict";

  const STORAGE_KEY = "pcs-language";
  const FALLBACK_LANGUAGE = "en";
  const SUPPORTED_LANGUAGES = Object.freeze(["en", "zh-TW", "ja", "ko"]);
  const supportedLanguageSet = new Set(SUPPORTED_LANGUAGES);
  const dictionaryCache = new Map();

  function normalizeLanguage(language) {
    return supportedLanguageSet.has(language) ? language : FALLBACK_LANGUAGE;
  }

  function readStoredLanguage() {
    try {
      return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return FALLBACK_LANGUAGE;
    }
  }

  function persistLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      // Storage can be disabled; the in-memory language remains available.
    }
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function mergeDictionaries(fallback, selected) {
    const merged = { ...fallback };

    Object.entries(selected).forEach(([key, value]) => {
      if (isPlainObject(value) && isPlainObject(fallback[key])) {
        merged[key] = mergeDictionaries(fallback[key], value);
      } else {
        merged[key] = value;
      }
    });

    return merged;
  }

  async function fetchDictionary(language) {
    if (!dictionaryCache.has(language)) {
      const request = fetch(`i18n/${language}.json`, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`Language file unavailable: ${language}`);
          return response.json();
        })
        .then((dictionary) => (isPlainObject(dictionary) ? dictionary : {}));
      dictionaryCache.set(language, request);
    }

    return dictionaryCache.get(language);
  }

  async function loadDictionary(language) {
    let fallbackDictionary = {};

    try {
      fallbackDictionary = await fetchDictionary(FALLBACK_LANGUAGE);
    } catch (error) {
      dictionaryCache.delete(FALLBACK_LANGUAGE);
    }

    if (language === FALLBACK_LANGUAGE) return fallbackDictionary;

    try {
      const selectedDictionary = await fetchDictionary(language);
      return mergeDictionaries(fallbackDictionary, selectedDictionary);
    } catch (error) {
      dictionaryCache.delete(language);
      return fallbackDictionary;
    }
  }

  function getValue(dictionary, key) {
    return key.split(".").reduce((value, segment) => value?.[segment], dictionary);
  }

  let currentLanguage = readStoredLanguage();
  let currentDictionary = {};
  let activeRequest = 0;
  let initializationPromise = null;

  async function setLanguage(language, options = {}) {
    const selectedLanguage = normalizeLanguage(language);
    const requestId = ++activeRequest;
    currentLanguage = selectedLanguage;
    document.documentElement.lang = selectedLanguage;

    if (options.persist !== false) persistLanguage(selectedLanguage);

    const dictionary = await loadDictionary(selectedLanguage);
    if (requestId !== activeRequest) return currentDictionary;

    currentDictionary = dictionary;
    window.dispatchEvent(new CustomEvent("pcs:languagechange", {
      detail: { language: currentLanguage, translations: currentDictionary },
    }));
    return currentDictionary;
  }

  function initialize() {
    if (!initializationPromise) {
      initializationPromise = setLanguage(currentLanguage, { persist: false });
    }
    return initializationPromise;
  }

  function translate(key, fallbackValue = "") {
    const value = getValue(currentDictionary, key);
    return typeof value === "string" ? value : fallbackValue;
  }

  window.PCSI18n = Object.freeze({
    FALLBACK_LANGUAGE,
    STORAGE_KEY,
    SUPPORTED_LANGUAGES,
    getDictionary: () => currentDictionary,
    getLanguage: () => currentLanguage,
    initialize,
    setLanguage,
    translate,
  });
})();
