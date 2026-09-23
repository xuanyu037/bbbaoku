/* 包安心 — 送出訂單前的防呆裝置：拖曳橘貓走到白貓身邊才能送出訂單，
   用「必須完成一次拖曳手勢」取代單純點擊，避免手滑誤觸送出訂單。
   拖曳過程中會沿路留下小貓爪印，完成後才會觸發 confirm-slider:done
   事件，交給 checkout.js 實際送出訂單。 */

(function () {
  function init() {
    const wrap = document.getElementById("confirm-slider");
    const handle = document.getElementById("confirm-slider-handle");
    const fill = document.getElementById("confirm-slider-fill");
    const label = document.getElementById("confirm-slider-label");
    const track = wrap ? wrap.querySelector(".confirm-slider-track") : null;
    if (!wrap || !handle || !fill || !label || !track) return;

    const DONE_THRESHOLD = 0.92;
    let dragging = false;
    let confirmed = false;
    let processing = false;
    let trackWidth = 0;
    let handleSize = 0;
    let startClientX = 0;
    let startLeft = 0;
    let lastFootprintX = null;

    function metrics() {
      trackWidth = track.clientWidth;
      handleSize = handle.offsetWidth;
    }

    function maxLeft() {
      return trackWidth - handleSize - 6;
    }

    function setProgress(left) {
      const max = maxLeft();
      const clamped = Math.max(0, Math.min(left, max));
      handle.style.left = clamped + 3 + "px";
      fill.style.width = clamped + handleSize + 3 + "px";
      const pct = max > 0 ? Math.round((clamped / max) * 100) : 0;
      wrap.setAttribute("aria-valuenow", String(pct));
      return { clamped, max, pct };
    }

    function spawnFootprint(centerX) {
      if (lastFootprintX !== null && Math.abs(centerX - lastFootprintX) < 22) return;
      lastFootprintX = centerX;
      const paw = document.createElement("div");
      paw.className = "confirm-paw";
      paw.style.left = centerX + "px";
      paw.innerHTML =
        '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
        '<ellipse cx="20" cy="26" rx="9" ry="7.4" fill="#e2924a"/>' +
        '<ellipse cx="10" cy="15" rx="3.4" ry="4.2" fill="#e2924a"/>' +
        '<ellipse cx="18" cy="10" rx="3.6" ry="4.4" fill="#e2924a"/>' +
        '<ellipse cx="26" cy="11" rx="3.4" ry="4.2" fill="#e2924a"/>' +
        '<ellipse cx="32" cy="17" rx="3" ry="3.8" fill="#e2924a"/>' +
        "</svg>";
      track.appendChild(paw);
      setTimeout(() => paw.remove(), 900);
    }

    function beginDrag(clientX) {
      if (confirmed || processing) return;
      metrics();
      dragging = true;
      handle.classList.add("dragging");
      startClientX = clientX;
      startLeft = handle.offsetLeft - 3;
      lastFootprintX = null;
    }

    function moveDrag(clientX) {
      if (!dragging) return;
      const dx = clientX - startClientX;
      const { clamped, pct } = setProgress(startLeft + dx);
      spawnFootprint(clamped + handleSize / 2);
      if (pct >= DONE_THRESHOLD * 100) complete();
    }

    function endDrag() {
      if (!dragging || confirmed) return;
      dragging = false;
      handle.classList.remove("dragging");
      handle.style.transition = "left .3s var(--ease)";
      fill.style.transition = "width .3s var(--ease), background .2s";
      setProgress(0);
      setTimeout(() => {
        handle.style.transition = "";
        fill.style.transition = "background .2s";
      }, 320);
    }

    function complete() {
      if (confirmed) return;
      confirmed = true;
      dragging = false;
      handle.classList.remove("dragging");
      metrics();
      handle.style.transition = "left .2s var(--ease)";
      fill.style.transition = "width .2s var(--ease), background .2s";
      setProgress(maxLeft());
      wrap.classList.add("confirmed");
      label.textContent = "確認送出中...";
      document.dispatchEvent(new CustomEvent("confirm-slider:done"));
    }

    handle.addEventListener("mousedown", (e) => {
      beginDrag(e.clientX);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => moveDrag(e.clientX));
    window.addEventListener("mouseup", endDrag);

    handle.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches && e.touches[0]) beginDrag(e.touches[0].clientX);
      },
      { passive: true }
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (dragging && e.touches && e.touches[0]) moveDrag(e.touches[0].clientX);
      },
      { passive: true }
    );
    window.addEventListener("touchend", endDrag);

    // 鍵盤可及性：方向鍵微調進度，達到六成後可用 Enter／空白鍵確認送出
    wrap.addEventListener("keydown", (e) => {
      if (confirmed || processing) return;
      metrics();
      const current = handle.offsetLeft - 3;
      if (e.key === "ArrowRight") {
        setProgress(current + 24);
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        setProgress(current - 24);
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        const max = maxLeft();
        if (max > 0 && current / max >= 0.6) complete();
        e.preventDefault();
      }
    });

    window.PohConfirmSlider = {
      reset() {
        confirmed = false;
        processing = false;
        dragging = false;
        wrap.classList.remove("confirmed");
        handle.classList.remove("dragging");
        label.textContent = wrap.dataset.defaultLabel || "拖曳到底～完成訂購 ฅ^•ﻌ•^ฅ";
        metrics();
        setProgress(0);
      },
      setProcessing(isProcessing) {
        processing = isProcessing;
        wrap.classList.toggle("processing", isProcessing);
      },
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
