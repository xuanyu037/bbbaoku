/**
 * 把訂單資料匯出成 Excel 檔案（.xlsx）。
 *
 * 用法：
 *   node export-orders.js                本機 orders.json 匯出
 *   node export-orders.js --remote       改抓正式站 /api/admin/orders（需要 BASE_URL 與 ADMIN_SECRET）
 *
 * 輸出檔案：server/exports/orders-YYYY-MM-DD.xlsx
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { listOrders } = require("./orders");

const COD_METHOD_LABEL = { home: "宅配到府", "711": "7-11 取貨付款", family: "全家取貨付款" };
const STATUS_LABEL = {
  confirmed_cod: "貨到付款・已成立",
  pending_payment: "線上付款・待付款",
  paid: "已付款",
  payment_failed: "付款失敗",
};

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function fetchRemoteOrders() {
  const baseUrl = process.env.BASE_URL;
  const secret = process.env.ADMIN_SECRET;
  if (!baseUrl || !secret) {
    throw new Error("遠端匯出需要在 .env 設定 BASE_URL 與 ADMIN_SECRET");
  }
  const res = await fetch(`${baseUrl}/api/admin/orders?secret=${encodeURIComponent(secret)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "抓取遠端訂單失敗");
  return data;
}

function buildRows(orders) {
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

function autoWidth(rows) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    const maxLen = Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
}

async function main() {
  const useRemote = process.argv.includes("--remote");
  const orders = useRemote ? await fetchRemoteOrders() : listOrders();

  if (orders.length === 0) {
    console.log("目前沒有任何訂單資料可以匯出。");
    return;
  }

  const rows = buildRows(orders);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = autoWidth(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "訂單明細");

  const outDir = path.join(__dirname, "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `orders-${todayStamp()}.xlsx`);
  XLSX.writeFile(workbook, outFile);

  console.log(`已匯出 ${orders.length} 筆訂單到：${outFile}`);
}

main().catch((err) => {
  console.error("匯出失敗：", err.message);
  process.exit(1);
});
