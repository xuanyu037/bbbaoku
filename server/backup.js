/**
 * 每日訂單備份：把 orders.json 打包成當天日期的檔案，
 * 透過 pCloud 官方 API 上傳到使用者的 pCloud 雲端硬碟。
 *
 * 認證方式：使用 PCLOUD_AUTH_TOKEN（由 get-pcloud-token.js 產生），
 * 不使用帳號密碼——密碼只在產生 token 時用過一次，之後完全不需要。
 * token 可以隨時在 pCloud 網頁版「設定 > 安全性 > 已連接的應用程式」撤銷。
 *
 * 手動測試：在 server/ 目錄下執行 `node backup.js`
 * 自動排程：server.js 會用 node-cron 每天固定時間呼叫 runBackup()
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const ORDERS_FILE = path.join(__dirname, "orders.json");

function getConfig() {
  const { PCLOUD_AUTH_TOKEN, PCLOUD_API_HOST, PCLOUD_BACKUP_FOLDER } = process.env;
  if (!PCLOUD_AUTH_TOKEN) {
    throw new Error(
      "尚未設定 PCLOUD_AUTH_TOKEN，請先執行 `node get-pcloud-token.js` 產生 token，並依指示填入 server/.env。"
    );
  }
  return {
    apiHost: PCLOUD_API_HOST || "api.pcloud.com",
    token: PCLOUD_AUTH_TOKEN,
    folder: PCLOUD_BACKUP_FOLDER || "/包安心備份",
  };
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function ensureFolder(config) {
  const url = `https://${config.apiHost}/createfolderifnotexists?auth=${config.token}&path=${encodeURIComponent(config.folder)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.result !== 0) {
    throw new Error(`建立 pCloud 資料夾失敗：${data.error || JSON.stringify(data)}`);
  }
}

async function uploadFile(config, filename, content) {
  const form = new FormData();
  form.append("file", new Blob([content], { type: "application/json" }), filename);

  const url = `https://${config.apiHost}/uploadfile?auth=${config.token}&path=${encodeURIComponent(config.folder)}`;
  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();

  if (data.result !== 0) {
    throw new Error(`pCloud 上傳失敗：${data.error || JSON.stringify(data)}`);
  }
  return data;
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
  await uploadFile(config, filename, content);

  console.log(`[備份] 已上傳 ${filename} 到 pCloud ${config.folder}`);
}

if (require.main === module) {
  runBackup().catch((err) => {
    console.error("[備份] 失敗：", err.message);
    process.exit(1);
  });
}

module.exports = { runBackup };
