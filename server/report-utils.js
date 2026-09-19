/**
 * 報表共用工具：台北時區日期計算、訂單→Excel 列的轉換、
 * 欄寬自動調整。給 export-orders.js / daily-report.js /
 * monthly-report.js 共用，避免三邊各寫一份重複邏輯。
 */
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

const COD_METHOD_LABEL = { home: "宅配到府", "711": "7-11 取貨付款", family: "全家取貨付款" };
const STATUS_LABEL = {
  confirmed_cod: "貨到付款・已成立",
  pending_payment: "線上付款・待付款",
  paid: "已付款",
  payment_failed: "付款失敗",
};

/** 回傳指定 Date 在台北時區對應的日期字串 YYYY-MM-DD（不受伺服器自身時區影響）。 */
function taipeiDateString(date) {
  const shifted = new Date(date.getTime() + TAIPEI_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** 台北「昨天」的日期字串——用於伺服器在台北時間 00:00 觸發時，結算剛結束的那一天。 */
function yesterdayTaipeiDateString() {
  const now = new Date();
  const shifted = new Date(now.getTime() + TAIPEI_OFFSET_MS);
  shifted.setUTCDate(shifted.getUTCDate() - 1);
  return shifted.toISOString().slice(0, 10);
}

/** 給定 YYYY-MM-DD（台北時區的某一天），回傳該天 00:00:00.000～23:59:59.999（台北時間）對應的 UTC Date 區間。 */
function taipeiDayRangeUTC(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+08:00`);
  const end = new Date(`${dateStr}T23:59:59.999+08:00`);
  return { start, end };
}

/** 給定 YYYY-MM-DD，回傳所屬月份 1 號 00:00:00（台北時間）到該天 23:59:59.999（台北時間）的 UTC 區間，用於「當月至今」彙總。 */
function taipeiMonthToDateRangeUTC(dateStr) {
  const [y, m] = dateStr.split("-");
  const monthStart = `${y}-${m}-01`;
  const { start } = taipeiDayRangeUTC(monthStart);
  const { end } = taipeiDayRangeUTC(dateStr);
  return { start, end, yearMonth: `${y}-${m}` };
}

function buildOrderRows(orders) {
  return orders.map((o) => ({
    訂單編號: o.orderId,
    建立時間: o.createdAt ? new Date(o.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "",
    收件人: o.customer?.name || "",
    電話: o.customer?.phone || "",
    Email: o.customer?.email || "",
    地址: o.customer?.address || "",
    商品明細: (o.items || []).map((i) => `${i.name} x${i.qty}`).join("；"),
    商品小計: o.subtotal,
    運費: o.shippingFee,
    應付總額: o.amount,
    結帳方式: o.shippingMethod === "cod" ? "貨到付款" : "線上結帳",
    取貨方式: o.codMethod ? COD_METHOD_LABEL[o.codMethod] || o.codMethod : "",
    訂單狀態: STATUS_LABEL[o.status] || o.status,
    備註: o.customer?.note || "",
  }));
}

/** 依商品彙總銷售數量與金額，回傳給總覽表用的列陣列。 */
function buildProductSummaryRows(orders) {
  const byProduct = new Map();
  for (const o of orders) {
    for (const item of o.items || []) {
      const cur = byProduct.get(item.name) || { 商品: item.name, 銷售數量: 0, 銷售金額: 0 };
      cur.銷售數量 += item.qty;
      cur.銷售金額 += item.price * item.qty;
      byProduct.set(item.name, cur);
    }
  }
  return Array.from(byProduct.values()).sort((a, b) => b.銷售金額 - a.銷售金額);
}

function autoWidth(rows) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    const maxLen = Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
}

module.exports = {
  taipeiDateString,
  yesterdayTaipeiDateString,
  taipeiDayRangeUTC,
  taipeiMonthToDateRangeUTC,
  buildOrderRows,
  buildProductSummaryRows,
  autoWidth,
};
