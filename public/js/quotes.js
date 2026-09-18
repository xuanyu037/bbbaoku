/* 包安心 — 溫暖照護小語：緩緩淡入淡出輪播的暖心句子 */

(function () {
  const QUOTES = [
    "每一次細心更換，都是愛最實際的樣子。",
    "您辛苦的照顧，我們想幫忙分擔一點點。",
    "選對尺寸，讓照護少一分負擔，多一分安心。",
    "包安心，包的不只是尿布，是您一整天的安心。",
    "謝謝您，一直溫柔地照顧著最重要的人。",
  ];

  function init() {
    const els = document.querySelectorAll("[data-care-quote]");
    if (!els.length) return;

    els.forEach((el) => {
      let i = 0;
      el.textContent = QUOTES[0];
      requestAnimationFrame(() => el.classList.add("show"));

      setInterval(() => {
        el.classList.remove("show");
        setTimeout(() => {
          i = (i + 1) % QUOTES.length;
          el.textContent = QUOTES[i];
          el.classList.add("show");
        }, 420);
      }, 4200);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
