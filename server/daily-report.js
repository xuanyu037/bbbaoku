/**
 * 每日結單報表：以「台北時間 00:00」為每日收單截止點，結算剛結束
 * 的那一天的全部訂單，產生 Excel 報表上傳到 pCloud，並接著更新
 * 當月的月報表（monthly-report.js）。
 *
 * 手動測試：node daily-report.js [YYYY-MM-DD]（可指定要結算哪一天，預設是台北時間的昨天）
 * 自動排程：server.js 用 node-cron 在台北時間每天 00:00 呼叫 runDailyReport()
 */
require("dotenv").config();
const XLSX = require("xlsx");
const { listOrdersBetween } = require("./orders");
const { uploadToPCloud } = require("./pcloud-client");
const { runMonthlyReport } = require("./monthly-report");
const {
  yesterdayTaipeiDateString,
  taipeiDayRangeUTC,
  buildOrderRows,
  buildProductSummaryRows,
  autoWidth,
} = require("./report-utils");

function buildOverviewRows(dateStr, orders) {
  const codCount = orders.filter((o) => o.shippingMethod === "cod").length;
  const onlineCount = orders.length - codCount;
  const totalQty = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + i.qty, 0), 0);

  return [
    { 項目: "結算日期（台北時間）", 數值: dateStr },
    { 項目: "訂單總數", 數值: orders.length },
    { 項目: "商品總件數", 數值: totalQty },
    { 項目: "商品小計合計", 數值: orders.reduce((s, o) => s + o.subtotal, 0) },
    { 項目: "運費合計", 數值: orders.reduce((s, o) => s + o.shippingFee, 0) },
    { 項目: "營業額合計", 數值: orders.reduce((s, o) => s + o.amount, 0) },
    { 項目: "貨到付款訂單數", 數值: codCount },
    { 項目: "線上結帳訂單數", 數值: onlineCount },
  ];
}

async function runDailyReport(referenceDateStr) {
  const dateStr = referenceDateStr || yesterdayTaipeiDateString();
  const { start, end } = taipeiDayRangeUTC(dateStr);

  const orders = await listOrdersBetween(start, end);
  if (orders.length === 0) {
    console.log(`[日報] ${dateStr} 沒有任何訂單，略過本次上傳。`);
  } else {
    const workbook = XLSX.utils.book_new();

    const overviewRows = buildOverviewRows(dateStr, orders);
    const overviewSheet = XLSX.utils.json_to_sheet(overviewRows, { skipHeader: true });
    overviewSheet["!cols"] = [{ wch: 20 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, overviewSheet, "當日總覽");

    const productRows = buildProductSummaryRows(orders);
    const productSheet = XLSX.utils.json_to_sheet(productRows);
    productSheet["!cols"] = autoWidth(productRows);
    XLSX.utils.book_append_sheet(workbook, productSheet, "商品銷售彙總");

    const detailRows = buildOrderRows(orders);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    detailSheet["!cols"] = autoWidth(detailRows);
    XLSX.utils.book_append_sheet(workbook, detailSheet, "訂單明細");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = `daily-report-${dateStr}.xlsx`;
    const folder = (process.env.PCLOUD_BACKUP_FOLDER || "/包安心備份") + "/每日報表";

    const result = await uploadToPCloud(
      filename,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      folder
    );

    console.log(`[日報] 已上傳 ${filename}（${orders.length} 筆訂單）到 pCloud ${result.folder}`);
  }

  // 不論當天有沒有訂單，都重新整理一次當月報表，確保月報表永遠反映最新狀態
  await runMonthlyReport(dateStr);
}

if (require.main === module) {
  const arg = process.argv[2];
  runDailyReport(arg).catch((err) => {
    console.error("[日報] 失敗：", err.message);
    process.exit(1);
  });
}

module.exports = { runDailyReport };
