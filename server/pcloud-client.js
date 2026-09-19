/**
 * pCloud 官方 API 的共用上傳工具，給每日備份、每日報表、每月報表共用。
 * 認證方式見 backup.js 開頭說明（token 由 get-pcloud-token.js 產生）。
 */
function getConfig(folderOverride) {
  const { PCLOUD_AUTH_TOKEN, PCLOUD_API_HOST, PCLOUD_BACKUP_FOLDER } = process.env;
  if (!PCLOUD_AUTH_TOKEN) {
    throw new Error(
      "尚未設定 PCLOUD_AUTH_TOKEN，請先執行 `node get-pcloud-token.js` 產生 token，並依指示填入 server/.env。"
    );
  }
  return {
    apiHost: PCLOUD_API_HOST || "api.pcloud.com",
    token: PCLOUD_AUTH_TOKEN,
    folder: folderOverride || PCLOUD_BACKUP_FOLDER || "/包安心備份",
  };
}

async function ensureFolder(config) {
  const url = `https://${config.apiHost}/createfolderifnotexists?auth=${config.token}&path=${encodeURIComponent(config.folder)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.result !== 0) {
    throw new Error(`建立 pCloud 資料夾失敗：${data.error || JSON.stringify(data)}`);
  }
}

/**
 * 上傳檔案到 pCloud。
 * @param {string} filename 檔名
 * @param {Buffer|string} content 檔案內容
 * @param {string} contentType MIME type
 * @param {string} [folder] 覆蓋預設資料夾（例如子資料夾 "/包安心備份/每日報表"）
 */
async function uploadToPCloud(filename, content, contentType, folder) {
  const config = getConfig(folder);
  await ensureFolder(config);

  const form = new FormData();
  form.append("file", new Blob([content], { type: contentType }), filename);

  const url = `https://${config.apiHost}/uploadfile?auth=${config.token}&path=${encodeURIComponent(config.folder)}`;
  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();

  if (data.result !== 0) {
    throw new Error(`pCloud 上傳失敗：${data.error || JSON.stringify(data)}`);
  }
  return { ...data, folder: config.folder };
}

module.exports = { uploadToPCloud };
