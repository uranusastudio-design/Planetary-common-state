(function initializeIntroScreen() {
  "use strict";

  const intro = document.querySelector("#pcs-intro");
  const enterButton = document.querySelector("#intro-enter");
  const observatoryContent = document.querySelectorAll("[data-observatory-content]");
  const observatoryTitle = document.querySelector("#page-title");

  if (!intro || !enterButton) {
    document.body.classList.remove("intro-active");
    return;
  }

  let isEntering = false;
  let transitionFinished = false;

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
    };

    const handleTransitionEnd = (event) => {
      if (event.target !== intro || event.propertyName !== "opacity") return;
      finishTransition();
    };

    intro.addEventListener("transitionend", handleTransitionEnd);
    window.setTimeout(finishTransition, 700);
  }

  enterButton.addEventListener("click", revealObservatory);
  enterButton.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    revealObservatory();
  });
})();
