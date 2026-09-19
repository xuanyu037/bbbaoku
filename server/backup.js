/**
 * 每日訂單備份：從資料庫（Neon PostgreSQL）撈出全部訂單，
 * 打包成當天日期的 JSON 檔案，透過 pCloud 官方 API 上傳到
 * 使用者的 pCloud 雲端硬碟，當作資料庫以外的一份原始資料備援
 * （另外還有 daily-report.js 產生的人看得懂的 Excel 報表）。
 *
 * 手動測試：在 server/ 目錄下執行 `node backup.js`
 * 自動排程：server.js 會用 node-cron 每天固定時間呼叫 runBackup()
 */
require("dotenv").config();
const { listOrders } = require("./orders");
const { uploadToPCloud } = require("./pcloud-client");

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function runBackup() {
  const orders = await listOrders();
  if (orders.length === 0) {
    console.log("[備份] 尚無訂單資料，略過本次備份。");
    return;
  }

  const content = JSON.stringify(orders, null, 2);
  const filename = `orders-${todayStamp()}.json`;

  const result = await uploadToPCloud(filename, content, "application/json");
  console.log(`[備份] 已上傳 ${filename} 到 pCloud ${result.folder}`);
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error("[備份] 失敗：", err.message);
    process.exit(1);
  });
}

module.exports = { runBackup };
