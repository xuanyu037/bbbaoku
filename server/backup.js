/**
 * 每日訂單備份：把 orders.json 打包成當天日期的檔案，
 * 透過 WebDAV 上傳到使用者的 pCloud 雲端硬碟。
 *
 * pCloud 帳密屬機密資訊，一律從環境變數讀取（見 .env.example），
 * 建議在 pCloud 後台「設定 > 安全性 > App 密碼」另外產生一組
 * 專用密碼，不要直接用登入密碼。
 *
 * 手動測試：在 server/ 目錄下執行 `node backup.js`
 * 自動排程：server.js 會用 node-cron 每天固定時間呼叫 runBackup()
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");

const ORDERS_FILE = path.join(__dirname, "orders.json");

function getConfig() {
  const { PCLOUD_WEBDAV_URL, PCLOUD_EMAIL, PCLOUD_PASSWORD, PCLOUD_BACKUP_FOLDER } = process.env;
  if (!PCLOUD_EMAIL || !PCLOUD_PASSWORD) {
    throw new Error(
      "尚未設定 PCLOUD_EMAIL / PCLOUD_PASSWORD，請參考 server/.env.example 設定 .env 後再啟用每日備份。"
    );
  }
  return {
    baseUrl: (PCLOUD_WEBDAV_URL || "https://webdav.pcloud.com").replace(/\/$/, ""),
    email: PCLOUD_EMAIL,
    password: PCLOUD_PASSWORD,
    folder: PCLOUD_BACKUP_FOLDER || "/包安心備份",
  };
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function webdavRequest(config, method, pathname, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.baseUrl + encodeURI(pathname));
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method,
        auth: `${config.email}:${config.password}`,
        headers: body
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
          : undefined,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode, body: responseBody }));
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function ensureFolder(config) {
  // MKCOL 建立備份資料夾；資料夾已存在時 pCloud 會回 405，直接忽略即可
  await webdavRequest(config, "MKCOL", config.folder);
}

async function runBackup() {
  const config = getConfig();

  if (!fs.existsSync(ORDERS_FILE)) {
    console.log("[備份] 尚無訂單資料，略過本次備份。");
    return;
  }

  const content = fs.readFileSync(ORDERS_FILE, "utf8");
  const filename = `orders-${todayStamp()}.json`;

  await ensureFolder(config);
  const result = await webdavRequest(config, "PUT", `${config.folder}/${filename}`, content);

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`pCloud 上傳失敗（HTTP ${result.statusCode}）：${result.body.slice(0, 200)}`);
  }

  console.log(`[備份] 已上傳 ${filename} 到 pCloud ${config.folder}`);
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error("[備份] 失敗：", err.message);
    process.exit(1);
  });
}

module.exports = { runBackup };
