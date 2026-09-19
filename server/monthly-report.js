/**
 * 每月報表：彙總「當月至今」的全部訂單，產生 Excel 並上傳到 pCloud。
 * 每次執行都是用資料庫重新算一次完整的當月資料再覆蓋上傳，
 * 不是增量修改舊檔案，所以永遠跟資料庫內容一致、不會累積誤差。
 *
 * 手動測試：node monthly-report.js [YYYY-MM-DD]（可指定要結算哪個月份，預設是今天）
 * 自動排程：daily-report.js 每天結算完當日報表後，會接著呼叫這裡更新當月報表。
 */
require("dotenv").config();
const XLSX = require("xlsx");
const { listOrdersBetween } = require("./orders");
const { uploadToPCloud } = require("./pcloud-client");
const { taipeiDateString, taipeiMonthToDateRangeUTC, buildOrderRows, buildProductSummaryRows, autoWidth } = require("./report-utils");

function buildDailyBreakdownRows(orders) {
  const byDay = new Map();
  for (const o of orders) {
    const day = taipeiDateString(new Date(o.createdAt));
    const cur = byDay.get(day) || { 日期: day, 訂單數: 0, 營業額: 0 };
    cur.訂單數 += 1;
    cur.營業額 += o.amount;
    byDay.set(day, cur);
  }
  return Array.from(byDay.values()).sort((a, b) => (a.日期 < b.日期 ? -1 : 1));
}

async function runMonthlyReport(referenceDateStr) {
  const dateStr = referenceDateStr || taipeiDateString(new Date());
  const { start, end, yearMonth } = taipeiMonthToDateRangeUTC(dateStr);

  const orders = await listOrdersBetween(start, end);
  if (orders.length === 0) {
    console.log(`[月報] ${yearMonth} 目前尚無訂單資料，略過本次上傳。`);
    return;
  }

  const workbook = XLSX.utils.book_new();

  const dailyRows = buildDailyBreakdownRows(orders);
  const dailySheet = XLSX.utils.json_to_sheet(dailyRows);
  dailySheet["!cols"] = autoWidth(dailyRows);
  XLSX.utils.book_append_sheet(workbook, dailySheet, "每日彙總");

  const productRows = buildProductSummaryRows(orders);
  const productSheet = XLSX.utils.json_to_sheet(productRows);
  productSheet["!cols"] = autoWidth(productRows);
  XLSX.utils.book_append_sheet(workbook, productSheet, "商品銷售彙總");

  const detailRows = buildOrderRows(orders);
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet["!cols"] = autoWidth(detailRows);
  XLSX.utils.book_append_sheet(workbook, detailSheet, "訂單明細");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `monthly-report-${yearMonth}.xlsx`;
  const folder = (process.env.PCLOUD_BACKUP_FOLDER || "/包安心備份") + "/每月報表";

  const result = await uploadToPCloud(
    filename,
    buffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    folder
  );

  console.log(`[月報] 已更新 ${filename}（累計 ${orders.length} 筆訂單）到 pCloud ${result.folder}`);
}

if (require.main === module) {
  const arg = process.argv[2];
  runMonthlyReport(arg).catch((err) => {
    console.error("[月報] 失敗：", err.message);
    process.exit(1);
  });
}

module.exports = { runMonthlyReport };
