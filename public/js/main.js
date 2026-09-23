/* 包安心 — 共用元件：導覽列、首次訂購須知彈窗、購物車側欄 */

document.addEventListener("DOMContentLoaded", () => {
  initNoticeModal();
  initCartDrawer();
  renderCartBadge();
  initRevealObserver();
  document.addEventListener("cart:change", renderCartBadge);
});

/* ---------- 首次進站訂購須知彈窗 ---------- */
function initNoticeModal() {
  const overlay = document.getElementById("notice-modal");
  if (!overlay) return;
  const SEEN_KEY = "poh_notice_seen_v1";

  const open = () => overlay.classList.add("show");
  const close = () => {
    overlay.classList.remove("show");
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch (e) {}
  };

  let seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === "1";
  } catch (e) {}

  if (!seen) {
    setTimeout(open, 400);
  }

  overlay.querySelectorAll("[data-notice-close]").forEach((el) =>
    el.addEventListener("click", close)
  );
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("show")) close();
  });
}

/* ---------- 購物車側欄 ---------- */
function initCartDrawer() {
  const overlay = document.getElementById("cart-overlay");
  const drawer = document.getElementById("cart-drawer");
  if (!overlay || !drawer) return;

  const open = () => {
    renderCartDrawer();
    overlay.classList.add("show");
    drawer.classList.add("show");
  };
  const close = () => {
    overlay.classList.remove("show");
    drawer.classList.remove("show");
  };

  document.querySelectorAll("[data-open-cart]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    })
  );
  document.querySelectorAll("[data-close-cart]").forEach((el) =>
    el.addEventListener("click", close)
  );
  overlay.addEventListener("click", close);

  document.addEventListener("cart:change", () => {
    if (drawer.classList.contains("show")) renderCartDrawer();
  });
}

function renderCartDrawer() {
  const list = document.getElementById("cart-items");
  const footTotal = document.getElementById("cart-subtotal-value");
  if (!list) return;

  const lines = Cart.lines();
  if (lines.length === 0) {
    list.innerHTML = '<div class="cart-empty">購物車目前是空的<br />快去挑選適合的尺寸吧</div>';
  } else {
    list.innerHTML = lines
      .map(
        (l) => `
      <div class="cart-line" data-id="${l.product.id}">
        <img src="${l.product.image}" alt="${l.product.name}" />
        <div class="cart-line-info">
          <div class="cart-line-name">${l.product.name}</div>
          <div class="cart-line-price">${formatNT(l.product.price)} × ${l.qty} = ${formatNT(l.product.price * l.qty)}</div>
          <div class="qty-stepper" style="margin-top:8px;">
            <button data-step="-1">－</button>
            <input type="text" value="${l.qty}" readonly />
            <button data-step="1">＋</button>
          </div>
        </div>
        <button class="cart-line-remove" data-remove>移除</button>
      </div>`
      )
      .join("");

    list.querySelectorAll("[data-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest(".cart-line").dataset.id;
        const delta = parseInt(btn.dataset.step, 10);
        const current = Cart.read()[id] || 0;
        Cart.setQty(id, current + delta);
      });
    });
    list.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest(".cart-line").dataset.id;
        Cart.remove(id);
      });
    });
  }

  if (footTotal) footTotal.textContent = formatNT(Cart.subtotal());
}

function renderCartBadge() {
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    const count = Cart.count();
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

/* ---------- 滾動淡入：區塊進入視窗時緩緩浮現 ---------- */
function initRevealObserver() {
  const els = document.querySelectorAll("[data-reveal]:not([data-reveal-bound])");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  els.forEach((el) => {
    el.dataset.revealBound = "1";
    observer.observe(el);
  });
}
window.PohReveal = initRevealObserver;

/* ---------- 加入購物車：商品縮圖飛向購物車圖示 ---------- */
function flyToCart(sourceImgEl) {
  const cartIcon = document.querySelector("[data-open-cart]");
  if (!sourceImgEl || !cartIcon) return;

  const startRect = sourceImgEl.getBoundingClientRect();
  const endRect = cartIcon.getBoundingClientRect();

  const clone = sourceImgEl.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.zIndex = "300";
  clone.style.left = startRect.left + "px";
  clone.style.top = startRect.top + "px";
  clone.style.width = startRect.width + "px";
  clone.style.height = startRect.height + "px";
  clone.style.margin = "0";
  clone.style.borderRadius = "8px";
  clone.style.pointerEvents = "none";
  clone.style.transition = "transform .6s cubic-bezier(.42,0,.58,1), opacity .6s ease";
  document.body.appendChild(clone);

  const dx = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
  const dy = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

  requestAnimationFrame(() => {
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
    clone.style.opacity = "0.2";
  });

  setTimeout(() => {
    clone.remove();
    cartIcon.classList.add("bump");
    setTimeout(() => cartIcon.classList.remove("bump"), 420);
  }, 600);
}
