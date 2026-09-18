/* 包安心 — 慶祝動畫：訂單成立／付款成功時，愛心與貓爪輕輕飄散開，
   純裝飾用的小儀式感，結束後自動清除，不留下任何 DOM 殘留。 */

(function () {
  function pawSvg(color, outline) {
    return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="26" rx="11" ry="9" fill="${color}" stroke="${outline}" stroke-width="1.2"/>
      <ellipse cx="9" cy="14" rx="4.2" ry="5.2" fill="${color}" stroke="${outline}" stroke-width="1"/>
      <ellipse cx="18" cy="8.5" rx="4.4" ry="5.4" fill="${color}" stroke="${outline}" stroke-width="1"/>
      <ellipse cx="27" cy="10" rx="4.2" ry="5.2" fill="${color}" stroke="${outline}" stroke-width="1"/>
      <ellipse cx="33" cy="17" rx="3.8" ry="4.8" fill="${color}" stroke="${outline}" stroke-width="1"/>
    </svg>`;
  }

  function heartSvg(color, outline) {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.6 2 5 5.6 5c2 0 3.4 1.1 4.4 2.6C11 6.1 12.4 5 14.4 5 18 5 19.7 8.6 22 11.7 14.5 16.4 12 21 12 21z" fill="${color}" stroke="${outline}" stroke-width="0.6"/>
    </svg>`;
  }

  const PALETTE = [
    { svg: heartSvg, color: "#d98aa0", outline: "#b85f72" },
    { svg: heartSvg, color: "#a9824f", outline: "#8a6a3d" },
    { svg: pawSvg, color: "#e2924a", outline: "#c97a37" },
    { svg: pawSvg, color: "#f7f3ea", outline: "#ddd0ba" },
  ];

  function celebrateBurst(originEl, count) {
    if (!originEl) return;
    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const layer = document.createElement("div");
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "300";
    layer.style.overflow = "hidden";
    document.body.appendChild(layer);

    const n = count || 14;
    for (let i = 0; i < n; i++) {
      const piece = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const angle = (Math.PI * 2 * i) / n + (Math.random() * 0.5 - 0.25);
      const dist = 90 + Math.random() * 70;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;
      const size = 16 + Math.random() * 14;
      const spin = Math.random() * 200 - 100;

      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.left = cx + "px";
      el.style.top = cy + "px";
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.marginLeft = -size / 2 + "px";
      el.style.marginTop = -size / 2 + "px";
      el.style.opacity = "0";
      el.style.transform = "translate(0,0) scale(.4) rotate(0deg)";
      el.style.transition = `transform ${0.9 + Math.random() * 0.4}s cubic-bezier(.16,.84,.44,1), opacity ${0.9 + Math.random() * 0.4}s ease`;
      el.innerHTML = piece.svg(piece.color, piece.outline);
      layer.appendChild(el);

      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = `translate(${dx}px, ${dy}px) scale(1) rotate(${spin}deg)`;
        setTimeout(() => {
          el.style.opacity = "0";
          el.style.transform += " translateY(30px)";
        }, 550);
      });
    }

    setTimeout(() => layer.remove(), 2000);
  }

  window.celebrateBurst = celebrateBurst;
})();
