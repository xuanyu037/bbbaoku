/**
 * 把訂單資料匯出成 Excel 檔案（.xlsx）。手動、隨時想看的時候用；
 * 自動的每日／每月報表見 daily-report.js / monthly-report.js。
 *
 * 用法：
 *   node export-orders.js                本機資料庫匯出全部訂單
 *   node export-orders.js --remote       改抓正式站 /api/admin/orders（需要 BASE_URL 與 ADMIN_SECRET）
 *
 * 輸出檔案：server/exports/orders-YYYY-MM-DD.xlsx
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { listOrders } = require("./orders");
const { taipeiDateString, buildOrderRows, autoWidth } = require("./report-utils");

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

async function main() {
  const useRemote = process.argv.includes("--remote");
  const orders = useRemote ? await fetchRemoteOrders() : await listOrders();

  if (orders.length === 0) {
    console.log("目前沒有任何訂單資料可以匯出。");
    return;
  }

  const rows = buildOrderRows(orders);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = autoWidth(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "訂單明細");

  const outDir = path.join(__dirname, "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `orders-${taipeiDateString(new Date())}.xlsx`);
  XLSX.writeFile(workbook, outFile);

  console.log(`已匯出 ${orders.length} 筆訂單到：${outFile}`);
}

main().catch((err) => {
  console.error("匯出失敗：", err.message);
  process.exit(1);
});
