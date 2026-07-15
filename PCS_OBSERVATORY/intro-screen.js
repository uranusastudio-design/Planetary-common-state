(function initializeIntroScreen() {
  "use strict";

  const intro = document.querySelector("#pcs-intro");
  const enterButton = document.querySelector("#intro-enter");
  const title = document.querySelector("#intro-title");
  const subtitle = document.querySelector("#intro-subtitle");
  const body = document.querySelector("#intro-body");
  const footerTitle = document.querySelector(".intro-screen__footer strong");
  const footerCopyright = document.querySelector(".intro-screen__footer span");
  const languageButtons = document.querySelectorAll("[data-intro-language]");
  const observatoryContent = document.querySelectorAll("[data-observatory-content]");
  const observatoryTitle = document.querySelector("#page-title");
  const i18n = window.PCSI18n;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!intro || !enterButton) {
    document.body.classList.remove("intro-active");
    return;
  }

  let isEntering = false;
  let isChangingLanguage = false;
  let transitionFinished = false;

  function updateLanguageButtons(language) {
    languageButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.introLanguage === language));
    });
  }

  function applyLandingTranslations() {
    if (!i18n) return;

    title.textContent = i18n.translate("landing.title", title.textContent);
    subtitle.textContent = i18n.translate("landing.subtitle", subtitle.textContent);
    body.textContent = i18n.translate("landing.body", body.textContent);
    enterButton.textContent = i18n.translate("landing.enter", "ENTER");
    footerTitle.textContent = i18n.translate("landing.footerTitle", footerTitle.textContent);
    footerCopyright.textContent = i18n.translate("landing.footerCopyright", footerCopyright.textContent);
    updateLanguageButtons(i18n.getLanguage());
  }

  async function selectLanguage(language) {
    if (!i18n || isChangingLanguage || language === i18n.getLanguage()) return;
    isChangingLanguage = true;

    try {
      await i18n.setLanguage(language);

      if (reducedMotion.matches) {
        applyLandingTranslations();
        return;
      }

      intro.classList.add("is-switching-language");
      await new Promise((resolve) => window.setTimeout(resolve, 130));
      applyLandingTranslations();
      window.requestAnimationFrame(() => intro.classList.remove("is-switching-language"));
    } finally {
      isChangingLanguage = false;
    }
  }

  function revealObservatory() {
    if (isEntering) return;
    isEntering = true;

    intro.classList.add("is-exiting");

    const finishTransition = () => {
      if (transitionFinished) return;
      transitionFinished = true;

      observatoryContent.forEach((element) => {
        element.removeAttribute("inert");
        element.removeAttribute("aria-hidden");
      });
      document.body.classList.remove("intro-active");
      intro.remove();
      observatoryTitle?.focus({ preventScroll: true });
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    };

    const handleTransitionEnd = (event) => {
      if (event.target !== intro || event.propertyName !== "opacity") return;
      finishTransition();
    };

    intro.addEventListener("transitionend", handleTransitionEnd);
    window.setTimeout(finishTransition, 700);
  }

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => selectLanguage(button.dataset.introLanguage));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectLanguage(button.dataset.introLanguage);
    });
  });

  enterButton.addEventListener("click", revealObservatory);
  enterButton.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    revealObservatory();
  });

  if (i18n) {
    i18n.initialize().then(applyLandingTranslations);
  } else {
    document.documentElement.lang = "en";
  }
})();
