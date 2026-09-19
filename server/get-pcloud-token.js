/**
 * 一次性小工具：用 pCloud OAuth 2.0 流程換取 auth token。
 *
 * 之前用「帳號密碼直接登入 API」的方式在有兩步驟驗證的帳號上行不通
 * （pCloud 會要求一個 OAuth 授權碼，不是兩步驟驗證的 6 位數字）。
 * 這個新版本改成：你在自己的瀏覽器登入 pCloud 網頁版（兩步驟驗證
 * 也是在那個網頁上完成，不用在終端機輸入任何驗證碼），授權後這支
 * 程式會自動接收授權碼並換成一組長期可用的 token。
 *
 * 事前準備（只需要做一次）：
 * 1. 瀏覽器打開 https://docs.pcloud.com/my_apps/，登入 pCloud
 * 2. 建立一個新的 App（名稱隨意，例如「包安心備份」）
 * 3. 在 Redirect URIs 欄位加入：http://localhost:8890/callback
 * 4. 儲存後，複製畫面上的 Client ID (App Key) 與 Client Secret
 *
 * 用法：
 *   node get-pcloud-token.js
 * 程式會用問的方式跟你要 Client ID 與 Client Secret，
 * 或者你也可以先設定環境變數再執行：
 *   PCLOUD_CLIENT_ID=xxx PCLOUD_CLIENT_SECRET=xxx node get-pcloud-token.js
 */
const http = require("http");
const readline = require("readline");

const PORT = 8890;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function getClientCredentials() {
  let { PCLOUD_CLIENT_ID: clientId, PCLOUD_CLIENT_SECRET: clientSecret } = process.env;
  if (clientId && clientSecret) return { clientId, clientSecret };

  console.log("尚未設定 PCLOUD_CLIENT_ID / PCLOUD_CLIENT_SECRET。");
  console.log("請先到 https://docs.pcloud.com/my_apps/ 建立一個 App，");
  console.log(`Redirect URIs 欄位請填：${REDIRECT_URI}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  clientId = clientId || (await ask(rl, "Client ID (App Key)："));
  clientSecret = clientSecret || (await ask(rl, "Client Secret："));
  rl.close();
  return { clientId, clientSecret };
}

function waitForAuthCode(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        code
          ? "<h2>授權成功，可以關閉這個分頁，回到終端機看結果。</h2>"
          : "<h2>授權失敗，請回到終端機查看錯誤訊息。</h2>"
      );

      server.close();
      if (code) resolve(code);
      else reject(new Error(error || "未收到授權碼"));
    });
    server.listen(port);
  });
}

async function main() {
  const { clientId, clientSecret } = await getClientCredentials();

  const authorizeUrl =
    `https://my.pcloud.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  console.log("\n請把下面這個網址複製到瀏覽器打開，登入你的 pCloud 帳號");
  console.log("（兩步驟驗證會在這個網頁上完成，不用在終端機輸入任何驗證碼）：\n");
  console.log(authorizeUrl);
  console.log("\n登入並按下「允許」授權後，網頁會自動跳轉，這支程式會自動接收，請稍候...\n");

  const code = await waitForAuthCode(PORT);

  const tokenUrl =
    `https://api.pcloud.com/oauth2_token?client_id=${encodeURIComponent(clientId)}` +
    `&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}`;
  const res = await fetch(tokenUrl);
  const data = await res.json();

  if (data.result !== 0 || !data.access_token) {
    console.error("\n換取 token 失敗：", JSON.stringify(data));
    process.exit(1);
  }

  console.log("\n成功！請把下面這行複製到 server/.env：\n");
  console.log(`PCLOUD_AUTH_TOKEN=${data.access_token}`);
  console.log(
    "\n這組 token 之後可以在 pCloud 網頁版「設定 > 安全性 > 已連接的應用程式」裡找到並隨時撤銷，不需要更改密碼。"
  );
}

main().catch((err) => {
  console.error("發生錯誤：", err.message);
  process.exit(1);
});
