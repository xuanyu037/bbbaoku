/**
 * 一次性小工具：用你的 pCloud 帳密換一組長期可用的 auth token，
 * 之後備份功能只需要這組 token，不需要再用到你的密碼。
 *
 * 這個腳本只在「你自己的電腦」執行、只跟 pCloud 官方伺服器通訊，
 * 帳密不會傳給任何第三方，也不會被寫進任何檔案（輸入的密碼只存在
 * 這次執行的記憶體裡，程式結束就消失）。
 *
 * 用法：在 server/ 目錄下執行
 *   node get-pcloud-token.js
 * 依照畫面提示輸入 pCloud 登入信箱與密碼即可（密碼輸入時畫面會
 * 正常顯示，因為只在你自己的終端機視窗裡，不會傳給任何人）。
 *
 * 如果你的帳號是歐洲機房，改成：
 *   PCLOUD_API_HOST=eapi.pcloud.com node get-pcloud-token.js
 */
const readline = require("readline");

const API_HOST = process.env.PCLOUD_API_HOST || "api.pcloud.com";

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log(`將連線到 https://${API_HOST}（如果你的帳號在歐洲機房，請先按 Ctrl+C 改用 PCLOUD_API_HOST=eapi.pcloud.com 重新執行）\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const email = await ask(rl, "pCloud 登入信箱：");
  const password = await ask(rl, "pCloud 密碼：");
  rl.close();

  const url = `https://${API_HOST}/userinfo?getauth=1&username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.result !== 0 || !data.auth) {
    console.error("\n登入失敗：", data.error || JSON.stringify(data));
    process.exit(1);
  }

  console.log("\n成功！請把下面兩行複製到 server/.env：\n");
  console.log(`PCLOUD_AUTH_TOKEN=${data.auth}`);
  console.log(`PCLOUD_API_HOST=${API_HOST}`);
  console.log("\n這組 token 之後可以在 pCloud 網頁版「設定 > 安全性 > 已連接的應用程式/裝置」裡找到並隨時撤銷，不需要更改密碼。");
}

main().catch((err) => {
  console.error("發生錯誤：", err.message);
  process.exit(1);
});
