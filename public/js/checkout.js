/* 包安心 — 結帳頁：訂單明細渲染、運費計算、送出訂單、導向藍新金流 */

const COD_FEE = 60;

document.addEventListener("DOMContentLoaded", () => {
  if (Cart.lines().length === 0) {
    window.location.href = "index.html#shop";
    return;
  }
  renderSummary();
  bindPayOptions();
  document.addEventListener("confirm-slider:done", submitOrder);
  document.addEventListener("cart:change", renderSummary);
});

function currentShippingMethod() {
  const checked = document.querySelector('input[name="payment"]:checked');
  return checked ? checked.value : "cod";
}

function currentCodMethod() {
  const checked = document.querySelector('input[name="cod-sub"]:checked');
  return checked ? checked.value : "home";
}

const COD_METHOD_LABEL = { home: "宅配到府", "711": "7-11 取貨付款", family: "全家取貨付款" };

function renderSummary() {
  const lines = Cart.lines();
  const container = document.getElementById("summary-items");
  container.innerHTML = lines
    .map(
      (l) => `
    <div class="summary-item">
      <img src="${l.product.image}" alt="${l.product.name}" />
      <div>
        <div class="n">${l.product.name} × ${l.qty}</div>
        <div class="m">${formatNT(l.product.price)} / 包</div>
      </div>
    </div>`
    )
    .join("");

  const subtotal = Cart.subtotal();
  const shippingFee = currentShippingMethod() === "cod" ? COD_FEE : 0;

  document.getElementById("summary-subtotal").textContent = formatNT(subtotal);
  document.getElementById("summary-shipping").textContent = shippingFee ? formatNT(shippingFee) : "免運費";
  document.getElementById("summary-total").textContent = formatNT(subtotal + shippingFee);
}

function bindPayOptions() {
  document.querySelectorAll(".pay-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      if (opt.classList.contains("pay-option-disabled")) return;
      document.querySelectorAll(".pay-option").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      opt.querySelector('input[name="payment"]').checked = true;
      renderSummary();
    });
  });
  document.querySelectorAll('input[name="cod-sub"]').forEach((input) => {
    input.addEventListener("change", () => {
      document.getElementById("checkout-msg").textContent = "";
      renderSummary();
    });
  });
}

async function submitOrder() {
  const msg = document.getElementById("checkout-msg");
  msg.textContent = "";

  const form = document.getElementById("checkout-form");
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const address = document.getElementById("address").value.trim();
  const note = document.getElementById("note").value.trim();

  if (!name || !phone || !address) {
    msg.textContent = "請填寫收件人姓名、電話與地址，才能請橘貓出發送出訂單喔。";
    form.reportValidity();
    if (window.PohConfirmSlider) window.PohConfirmSlider.reset();
    return;
  }

  const shippingMethod = currentShippingMethod();
  const codMethod = shippingMethod === "cod" ? currentCodMethod() : null;
  const items = Cart.lines().map((l) => ({ id: l.product.id, qty: l.qty }));
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

  if (codMethod === "711" && totalQty > 1) {
    msg.textContent = "7-11 取貨付款單筆限 1 包，包裹較多請改選宅配到府或全家取貨付款。";
    if (window.PohConfirmSlider) window.PohConfirmSlider.reset();
    return;
  }

  if (window.PohConfirmSlider) window.PohConfirmSlider.setProcessing(true);

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        customer: { name, phone, email, address, note },
        shippingMethod,
        codMethod,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "訂單建立失敗");

    if (shippingMethod === "cod") {
      Cart.clear();
      window.location.href = `order-result.html?orderId=${encodeURIComponent(data.orderId)}&status=cod&codMethod=${encodeURIComponent(codMethod)}`;
      return;
    }

    // 線上付款：向後端取得藍新金流表單參數，再自動送出至收銀台
    const mpgRes = await fetch(`/api/checkout/newebpay/${data.orderId}`, { method: "POST" });
    const mpgData = await mpgRes.json();
    if (!mpgRes.ok) throw new Error(mpgData.error || "無法建立線上付款");

    Cart.clear();
    submitToNewebPay(mpgData.mpgUrl, mpgData.fields);
  } catch (err) {
    msg.textContent = err.message || "系統發生錯誤，請稍後再試。";
    if (window.PohConfirmSlider) window.PohConfirmSlider.reset();
  }
}

function submitToNewebPay(actionUrl, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = actionUrl;
  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}
