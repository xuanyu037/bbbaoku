/* 包安心 — 貓爪殘影：不論桌面版（滑鼠移動）或手機版（觸控滑動），
   都會隨機出現橘貓／白貓爪，沿著游標／觸控軌跡漸現漸隱地留下
   足跡。不受螢幕寬度限制（手機版無關寬度都會呈現），純裝飾用，
   不影響任何點擊／滑動操作（容器 pointer-events:none）。 */

(function () {
  const THROTTLE_MS = 60;
  const MIN_STEP_PX = 16;
  const LIFETIME_MS = 950;
  const TOUCH_GUARD_MS = 800; // 觸控後短時間內忽略相容性合成的 mousemove，避免同一動作重複出現爪印

  const ORANGE = { color: "#e2924a", outline: "#c97a37" };
  const WHITE = { color: "#f7f3ea", outline: "#ddd0ba" };

  let layer = null;
  let lastSpawnTime = 0;
  let lastX = null;
  let lastY = null;
  let footFlip = false;
  let lastTouchTime = 0;

  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement("div");
    layer.className = "paw-trail-layer";
    document.body.appendChild(layer);
    return layer;
  }

  function pawSvg(color, outline) {
    return `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="26" rx="11" ry="9" fill="${color}" stroke="${outline}" stroke-width="1.2"/>
      <ellipse cx="9" cy="14" rx="4.2" ry="5.2" fill="${color}" stroke="${outline}" stroke-width="1"/>
      <ellipse cx="18" cy="8.5" rx="4.4" ry="5.4" fill="${color}" stroke="${outline}" stroke-width="1"/>
      <ellipse cx="27" cy="10" rx="4.2" ry="5.2" fill="${color}" stroke="${outline}" stroke-width="1"/>
      <ellipse cx="33" cy="17" rx="3.8" ry="4.8" fill="${color}" stroke="${outline}" stroke-width="1"/>
    </svg>`;
  }

  function spawnPaw(x, y) {
    const now = performance.now();
    if (now - lastSpawnTime < THROTTLE_MS) return;

    let angleDeg = 0;
    if (lastX !== null) {
      const dx = x - lastX;
      const dy = y - lastY;
      if (Math.hypot(dx, dy) < MIN_STEP_PX) return;
      angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    }

    lastSpawnTime = now;
    lastX = x;
    lastY = y;

    const set = Math.random() < 0.5 ? ORANGE : WHITE;
    footFlip = !footFlip;

    // 讓爪印沿著移動方向的垂直側輪流偏一點，模擬左右腳交替踩踏
    const perpRad = ((angleDeg + 90) * Math.PI) / 180;
    const stepOffset = footFlip ? 6 : -6;
    const px = x + Math.cos(perpRad) * stepOffset;
    const py = y + Math.sin(perpRad) * stepOffset;

    const paw = document.createElement("div");
    paw.className = "paw";
    paw.style.left = px + "px";
    paw.style.top = py + "px";
    paw.style.setProperty("--rot", angleDeg + 90 + (Math.random() * 10 - 5) + "deg");
    paw.innerHTML = pawSvg(set.color, set.outline);

    ensureLayer().appendChild(paw);
    setTimeout(() => paw.remove(), LIFETIME_MS);
  }

  function handleTouchStart(e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    lastTouchTime = performance.now();
    lastX = null;
    lastY = null;
    spawnPaw(t.clientX, t.clientY);
  }

  function handleTouchMove(e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    lastTouchTime = performance.now();
    spawnPaw(t.clientX, t.clientY);
  }

  function handleMouseMove(e) {
    if (performance.now() - lastTouchTime < TOUCH_GUARD_MS) return;
    spawnPaw(e.clientX, e.clientY);
  }

  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: true });
  window.addEventListener("mousemove", handleMouseMove);
})();
