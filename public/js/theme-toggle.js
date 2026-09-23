/**
 * 包安心 — 夜間模式切換（純視覺，不影響任何其他功能）。
 * 用 localStorage 記住使用者選擇；<head> 裡的小段 inline script 會在畫面畫出來之前
 * 先套用已儲存的模式，避免每次進站先閃一下亮色再變暗。
 */
(function () {
  const KEY = "poh_theme";
  const root = document.documentElement;

  function applyButtonState(btn, theme) {
    const icon = btn.querySelector(".theme-toggle-icon");
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", theme === "dark" ? "切換為日間模式" : "切換為夜間模式");
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {}
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => applyButtonState(btn, theme));
  }

  function injectNightSky() {
    if (document.querySelector(".night-sky")) return;
    const sky = document.createElement("div");
    sky.className = "night-sky";
    sky.setAttribute("aria-hidden", "true");
    sky.innerHTML =
      '<div class="night-sky-stars night-sky-stars-1"></div>' +
      '<div class="night-sky-stars night-sky-stars-2"></div>' +
      '<div class="night-sky-stars night-sky-stars-3"></div>' +
      '<div class="night-sky-earth">' +
      '<div class="night-sky-earth-glow"></div>' +
      '<div class="night-sky-earth-globe"></div>' +
      "</div>";
    document.body.insertBefore(sky, document.body.firstChild);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectNightSky();
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      applyButtonState(btn, current);
      btn.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        setTheme(next);
      });
    });
  });
})();
