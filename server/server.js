require("dotenv").config();
const path = require("path");
const express = require("express");
const { PRODUCTS, COD_SHIPPING_FEE } = require("./products");
const { nextOrderId, saveOrder, getOrder, updateOrder } = require("./orders");
const newebpay = require("./newebpay");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "public")));

/* ---------------------------------------------------------------
 * 建立訂單：由前端購物車送出 items + 客戶資料 + 結帳方式，
 * 金額一律以伺服器端商品目錄重新計算，不信任前端傳入的價格。
 * ------------------------------------------------------------- */
app.post("/api/orders", (req, res) => {
  const { items, customer, shippingMethod, codMethod } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "購物車是空的" });
  }
  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ error: "請填寫完整的收件資訊" });
  }
  if (!["cod", "online"].includes(shippingMethod)) {
    return res.status(400).json({ error: "結帳方式不正確" });
  }
  if (shippingMethod === "cod" && !["home", "711", "family"].includes(codMethod)) {
    return res.status(400).json({ error: "取貨方式不正確" });
  }

  let subtotal = 0;
  let totalQty = 0;
  const resolvedItems = [];
  for (const raw of items) {
    const product = PRODUCTS[raw.id];
    const qty = Math.max(1, parseInt(raw.qty, 10) || 0);
    if (!product || product.soldout || !product.price) {
      return res.status(400).json({ error: `商品「${raw.id}」目前無法購買` });
    }
    subtotal += product.price * qty;
    totalQty += qty;
    resolvedItems.push({ id: raw.id, name: product.name, price: product.price, qty });
  }

  if (shippingMethod === "cod" && codMethod === "711" && totalQty > 1) {
    return res.status(400).json({ error: "7-11 取貨付款單筆限 1 包，請改選宅配到府或全家取貨付款" });
  }

  const shippingFee = shippingMethod === "cod" ? COD_SHIPPING_FEE : 0;
  const amount = subtotal + shippingFee;
  const orderId = nextOrderId();

  const order = {
    orderId,
    items: resolvedItems,
    subtotal,
    shippingFee,
    amount,
    shippingMethod,
    codMethod: shippingMethod === "cod" ? codMethod : null,
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address,
      note: customer.note || "",
    },
    status: shippingMethod === "cod" ? "confirmed_cod" : "pending_payment",
    createdAt: new Date().toISOString(),
  };

  saveOrder(order);
  res.json({ orderId, amount, shippingFee, status: order.status });
});

/* ---------------------------------------------------------------
 * 線上結帳：以已建立的訂單產生藍新金流 MPG 表單參數。
 * 需先在 server/.env 設定 NEWEBPAY_MERCHANT_ID / HASHKEY / HASHIV。
 * ------------------------------------------------------------- */
app.post("/api/checkout/newebpay/:orderId", (req, res) => {
  const order = getOrder(req.params.orderId);
  if (!order) return res.status(404).json({ error: "找不到訂單" });
  if (order.shippingMethod !== "online") {
    return res.status(400).json({ error: "此訂單非線上付款" });
  }

  try {
    const { mpgUrl, fields } = newebpay.buildMpgFields(
      {
        orderId: order.orderId,
        amount: order.amount,
        itemDesc: order.items.map((i) => i.name).join("、"),
        email: order.customer.email,
      },
      {
        returnUrl: `${BASE_URL}/api/newebpay/return`,
        notifyUrl: `${BASE_URL}/api/newebpay/notify`,
        clientBackUrl: `${BASE_URL}/order-result.html?orderId=${order.orderId}`,
      }
    );
    res.json({ mpgUrl, fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------------------------------
 * 藍新背景通知（Server to Server）：驗證簽章後更新訂單狀態。
 * ------------------------------------------------------------- */
app.post("/api/newebpay/notify", (req, res) => {
  try {
    const { TradeInfo, TradeSha } = req.body;
    const { hashKey, hashIv } = newebpay.getConfig();

    if (!newebpay.verifyTradeSha(TradeInfo, TradeSha, hashKey, hashIv)) {
      return res.status(400).send("0|TradeSha 驗證失敗");
    }
    const result = newebpay.decryptTradeInfo(TradeInfo, hashKey, hashIv);
    const orderId = result.MerchantOrderNo;
    const paid = result.Status === "SUCCESS";

    updateOrder(orderId, {
      status: paid ? "paid" : "payment_failed",
      newebpayResult: result,
    });

    res.send("1|OK");
  } catch (err) {
    res.status(500).send("0|" + err.message);
  }
});

/* ---------------------------------------------------------------
 * 藍新付款完成導回（使用者瀏覽器 POST 到這裡）：解密結果後
 * 轉向前端的訂單結果頁。
 * ------------------------------------------------------------- */
app.post("/api/newebpay/return", (req, res) => {
  try {
    const { TradeInfo, TradeSha } = req.body;
    const { hashKey, hashIv } = newebpay.getConfig();
    const valid = newebpay.verifyTradeSha(TradeInfo, TradeSha, hashKey, hashIv);
    const result = valid ? newebpay.decryptTradeInfo(TradeInfo, hashKey, hashIv) : {};
    const orderId = result.MerchantOrderNo || "";
    const status = valid && result.Status === "SUCCESS" ? "paid" : "failed";
    res.redirect(`/order-result.html?orderId=${encodeURIComponent(orderId)}&status=${status}`);
  } catch (err) {
    res.redirect(`/order-result.html?status=failed`);
  }
});

app.get("/api/orders/:orderId", (req, res) => {
  const order = getOrder(req.params.orderId);
  if (!order) return res.status(404).json({ error: "找不到訂單" });
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`包安心網站伺服器已啟動：${BASE_URL}`);
});
