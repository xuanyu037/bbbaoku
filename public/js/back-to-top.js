/* 包安心 — 回到頂端：滾動超過一定距離後，右下角浮現橘貓爪按鈕 */

(function () {
  function init() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "back-to-top";
    btn.setAttribute("aria-label", "回到頂端");
    btn.innerHTML = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="26" rx="11" ry="9" fill="#e2924a" stroke="#c97a37" stroke-width="1.2"/>
      <ellipse cx="9" cy="14" rx="4.2" ry="5.2" fill="#e2924a" stroke="#c97a37" stroke-width="1"/>
      <ellipse cx="18" cy="8.5" rx="4.4" ry="5.4" fill="#e2924a" stroke="#c97a37" stroke-width="1"/>
      <ellipse cx="27" cy="10" rx="4.2" ry="5.2" fill="#e2924a" stroke="#c97a37" stroke-width="1"/>
      <ellipse cx="33" cy="17" rx="3.8" ry="4.8" fill="#e2924a" stroke="#c97a37" stroke-width="1"/>
    </svg>`;
    document.body.appendChild(btn);

    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener(
      "scroll",
      () => {
        btn.classList.toggle("show", window.scrollY > 480);
      },
      { passive: true }
    );
  }

  document.addEventListener("DOMContentLoaded", init);
})();
