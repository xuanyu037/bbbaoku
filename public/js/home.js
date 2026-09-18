/* 包安心 — 首頁：商品卡渲染、加入購物車、FAQ 手風琴、影片控制 */

document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  initFAQ();
  initHeroVideo();
});

function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map((p) => {
    const unit = unitPrice(p);
    return `
    <div class="product-card" data-id="${p.id}" data-reveal>
      <div class="product-media">
        <span class="badge ${p.badgeClass}">${p.type}</span>
        ${p.soldout ? '<span class="badge badge-soldout" style="left:auto;right:14px;">缺貨中</span>' : ""}
        <img src="${p.image}" alt="${p.name}" />
      </div>
      <div class="product-info">
        <div class="product-type">${p.type}．${p.size}</div>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-meta">${p.fit}<br />每包 ${p.pack} 片</div>
        <div class="product-price-row">
          ${
            p.soldout
              ? '<span class="product-price" style="color:#9a938a;font-size:15px;">補貨中，尺寸稍候提供</span>'
              : `<span class="product-price">${formatNT(p.price)}<small>／包</small></span>
                 <span class="unit-price">約 ${formatNT(unit)}／片</span>`
          }
        </div>
        <div class="product-actions">
          ${
            p.soldout
              ? '<button class="add-btn" disabled>暫無現貨</button>'
              : `
              <div class="qty-stepper">
                <button type="button" data-qty-step="-1">－</button>
                <input type="text" value="1" data-qty-input readonly />
                <button type="button" data-qty-step="1">＋</button>
              </div>
              <button class="add-btn" data-add>加入購物車</button>
              `
          }
        </div>
        ${p.soldout ? '<div class="soldout-note">此尺寸暫時缺貨，歡迎選購黏貼式 L 號或來電洽詢補貨時間。</div>' : ""}
      </div>
    </div>`;
  }).join("");

  if (window.PohReveal) window.PohReveal();

  grid.querySelectorAll(".product-card").forEach((card) => {
    const id = card.dataset.id;
    const input = card.querySelector("[data-qty-input]");
    card.querySelectorAll("[data-qty-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!input) return;
        const next = Math.max(1, parseInt(input.value, 10) + parseInt(btn.dataset.qtyStep, 10));
        input.value = next;
      });
    });
    const addBtn = card.querySelector("[data-add]");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const qty = input ? parseInt(input.value, 10) : 1;
        Cart.add(id, qty);
        flyToCart(card.querySelector(".product-media img"));
        addBtn.textContent = "已加入 ✓";
        setTimeout(() => (addBtn.textContent = "加入購物車"), 1200);
      });
    }
  });
}

function initFAQ() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const q = item.querySelector(".faq-q");
    const a = item.querySelector(".faq-a");
    q.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((other) => {
        if (other !== item) {
          other.classList.remove("open");
          other.querySelector(".faq-a").style.maxHeight = null;
        }
      });
      if (isOpen) {
        item.classList.remove("open");
        a.style.maxHeight = null;
      } else {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });
}

function initHeroVideo() {
  const video = document.getElementById("hero-video");
  const muteBtn = document.getElementById("hero-mute-btn");
  if (!video || !muteBtn) return;
  video.play().catch(() => {});
  muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    muteBtn.textContent = video.muted ? "🔇" : "🔊";
  });
}
