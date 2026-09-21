# 包安心 Peace of Mind 官網

台灣品牌成人紙尿褲「包安心」的購物網站。前台為純靜態 HTML/CSS/JS（`public/`），
後台為 Node.js + Express 小型服務（`server/`），負責建立訂單與串接藍新金流（NewebPay）MPG。

## 目錄結構

```
包安心官網/
├── public/                 前台網站（靜態檔案，由 server 或任意靜態伺服器提供）
│   ├── index.html          首頁：影片、訂購須知彈窗、商品選購、品牌故事、尺寸指南、FAQ
│   ├── checkout.html       結帳頁：收件資訊、貨到付款（宅配／7-11／全家）、送出訂單防呆滑塊
│   ├── order-result.html   結帳完成後的結果頁
│   ├── favicon.ico, site.webmanifest
│   ├── css/style.css
│   ├── js/data.js          商品資料 + 購物車（localStorage）
│   ├── js/main.js          導覽列、訂購須知彈窗、購物車側欄、滾動淡入、加入購物車動畫
│   ├── js/home.js          首頁商品渲染、FAQ 手風琴、影片控制
│   ├── js/checkout.js      結帳頁邏輯、送出訂單、導向藍新金流
│   ├── js/confirm-slider.js 送出訂單前的拖曳貓咪防呆滑塊
│   ├── js/paw-trail.js     滑鼠／觸控貓爪殘影裝飾
│   ├── js/quotes.js        溫暖照護小語輪播
│   ├── js/celebrate.js     訂單成立的愛心貓爪慶祝動畫
│   ├── js/back-to-top.js   回到頂端貓爪按鈕
│   └── assets/             商品圖片、介紹影片、favicon 圖示
└── server/                 後端（Node.js / Express）
    ├── server.js               API 路由 + 每日備份／報表排程（node-cron）
    ├── newebpay.js             藍新金流 AES 加解密與簽章（目前暫停串接）
    ├── products.js             伺服器端商品目錄（金額以此為準）
    ├── orders.js               訂單存取（PostgreSQL，正式資料庫，永久保存）
    ├── report-utils.js         報表共用工具：台北時區日期計算、訂單→Excel 列轉換
    ├── daily-report.js         每日 00:00（台北）結算前一天訂單，產生日報並觸發週報／月報
    ├── weekly-report.js        當週（週一～週日）彙總報表，每天重新整理一次
    ├── monthly-report.js       當月彙總報表，每天重新整理一次
    ├── export-orders.js        手動隨時匯出全部訂單成 Excel
    ├── backup.js               全部訂單原始資料備份到 pCloud（每天凌晨 3:00）
    ├── pcloud-client.js        pCloud 上傳共用邏輯
    ├── get-pcloud-token.js     一次性工具：透過 pCloud OAuth 換取 auth token
    ├── package.json
    └── .env.example            環境變數範例
```

## 功能對照需求

- ✅ 兩種結帳方式：**貨到付款**（+NT$60 運費，含宅配／7-11／全家取貨付款）／
  **線上結帳**（免運費，藍新金流，目前顯示「即將開放」，待商店資訊備妥後啟用）
- ✅ 藍新金流 MPG 全支付方式 API 串接（AES-256-CBC 加密 TradeInfo + SHA256 簽章）
- ✅ 首頁開頭嵌入並自動播放介紹影片（`assets/video/intro.mp4`，靜音自動播放＋可切換聲音）
- ✅ 首次進站自動彈出「訂購須知」視窗，提供明確關閉按鈕，並記住已讀狀態
- ✅ 導覽列選單滑鼠懸停時，項目有放大＋底線的流暢過場動畫
- ✅ 四款商品：安舒褲 L／XL、黏貼式 L、黏貼式 XL（缺貨中，加入購物車按鈕已停用）
- ✅ 每款商品價格旁自動換算並顯示「約 NT$X／片」的單片價格
- ✅ 強調台灣品牌與他牌差異（品牌故事段落：價格優勢＋日系規格用料；不宣稱生產製造地）
- ✅ 整體排版參考精品官網風格：大量留白、細字距標題、全幅影片、低調柔和動效

## 本機開發（前台先行預覽，不需要後端）

前台是純靜態檔案，若只想先看網站外觀與互動（首次彈窗、影片、導覽列動畫、購物車），
可以用任何靜態伺服器開啟 `public/` 目錄，例如：

```bash
cd public
python3 -m http.server 8090
```

再開啟 `http://localhost:8090`。**注意：**這種方式無法送出訂單／串接藍新金流，
因為 `/api/...` 路由需要 `server/` 的 Node 服務才會存在。

## 啟用完整功能（含建立訂單＋藍新金流）

> 本機目前偵測不到 `node` / `npm`，需要先安裝 Node.js（建議 18 LTS 以上）才能執行後端。
> macOS 可用 Homebrew 安裝：
>
> ```bash
> brew install node
> ```

安裝好 Node.js 後：

```bash
cd server
npm install
cp .env.example .env
```

編輯 `.env`，填入藍新金流商店後台取得的資訊：

```
NEWEBPAY_MERCHANT_ID=你的商店代號
NEWEBPAY_HASHKEY=你的 HashKey
NEWEBPAY_HASHIV=你的 HashIV
NEWEBPAY_MPG_URL=https://ccore.newebpay.com/MPG/mpg_gateway   # 測試環境
```

正式上線前，記得：

1. 到藍新金流商店後台申請「MPG 全支付方式」，取得正式的 `MerchantID` / `HashKey` / `HashIV`。
2. 將 `NEWEBPAY_MPG_URL` 換成正式環境網址：`https://core.newebpay.com/MPG/mpg_gateway`。
3. 將 `BASE_URL` 換成正式網域（例如 `https://www.yourdomain.com`），
   並在藍新後台設定對應的 **NotifyURL / ReturnURL 白名單網域**。
4. `server/orders.json` 只是示範用的檔案式資料庫，正式營運建議改接真正的資料庫，
   並加上訂單查詢、後台管理、Email／簡訊通知等機制。

啟動伺服器：

```bash
npm start
```

預設會在 `http://localhost:3000` 提供整個網站（前台頁面＋API），因為 `server.js`
已經把 `public/` 設為靜態資源目錄，不需要額外再開一個靜態伺服器。

## 藍新金流串接說明（給之後維護的人）

- `POST /api/orders`：前端送出購物車內容與收件資訊，**金額一律由 `server/products.js`
  重新計算**，不會信任前端傳來的價格，避免被竄改。
- `POST /api/checkout/newebpay/:orderId`：針對已建立、且結帳方式為線上付款的訂單，
  產生藍新 MPG 表單所需的 `MerchantID / TradeInfo / TradeSha`，前端收到後會動態
  建立表單並自動 POST 到藍新收銀台。
- `POST /api/newebpay/notify`：藍新的**背景通知**（Server to Server），驗證
  `TradeSha` 後解密 `TradeInfo`，更新訂單狀態為 `paid` 或 `payment_failed`。
- `POST /api/newebpay/return`：使用者付款完成後，瀏覽器會被藍新導回這裡，
  解密結果後轉址到 `order-result.html` 顯示付款結果。

## 訂單保存與自動報表

- **訂單資料**：一律即時寫入 PostgreSQL（正式站使用 Neon 免費方案），不會因
  伺服器重啟或重新部署而消失，已用正式站真實重啟測試驗證過。隨時可用
  `GET /api/admin/orders?secret=ADMIN_SECRET` 或 `node export-orders.js --remote`
  直接把全部訂單資料抓出來，跟 pCloud 是否連上完全無關。
- **每日報表**（`daily-report.js`）：每天台北時間 00:00 為收單截止點，結算
  剛結束的那一天，產生「當日總覽／商品銷售彙總／訂單明細」三分頁 Excel。
- **每週報表**（`weekly-report.js`）：以週一～週日為一週，每天結算完日報後
  會重新整理一次當週報表（「每日彙總／商品銷售彙總／訂單明細」三分頁），
  永遠反映當週至今的最新資料。
- **每月報表**（`monthly-report.js`）：邏輯同週報，彙總範圍是當月 1 號至今。
- 三份報表產生後都會呼叫 `pcloud-client.js` 上傳到 pCloud（日報存
  `每日報表/`、週報存 `每週報表/`、月報存 `每月報表/`，皆在
  `PCLOUD_BACKUP_FOLDER` 底下，預設 `/包安心備份`）。**在 pCloud OAuth
  App 審核通過、`PCLOUD_AUTH_TOKEN` 設定好之前，這個上傳步驟每次都會失敗**，
  只會在伺服器 log 留下錯誤訊息，不影響下單或資料保存，也不會讓伺服器當掉。
- `server/get-pcloud-token.js`：**一次性**小工具，pCloud App 審核通過、拿到
  `PCLOUD_CLIENT_ID` / `PCLOUD_CLIENT_SECRET` 後，在 `server/` 目錄下執行
  `node get-pcloud-token.js`，依畫面提示完成瀏覽器 OAuth 授權，換取一組
  長期可用的 `auth token`，填進 `server/.env`（`PCLOUD_AUTH_TOKEN`）以及
  正式站的環境變數。token 之後可以在 pCloud 網頁版「設定 > 安全性 >
  已連接的應用程式」隨時撤銷，不需要更改密碼。
- 帳號在歐洲機房的話，要把 `PCLOUD_API_HOST` 設成 `eapi.pcloud.com`
  （預設是美國機房 `api.pcloud.com`）。
- 各報表也都能手動立即執行測試，例如：`node weekly-report.js`、
  `node monthly-report.js 2026-09-01`（可傳入 `YYYY-MM-DD` 指定要結算的
  日期／所屬週／所屬月）。

## 已測試 / 尚未測試

以下都已在本機及正式站用真實伺服器實測過：訂購須知彈窗、影片自動播放、
導覽列放大動效、商品選購、購物車、結帳頁金額試算、拖曳貓咪防呆滑塊送出
訂單、COD 三種取貨方式（宅配／7-11／全家）的金額與數量限制驗證、訂單正確
寫入 PostgreSQL 並在正式站重啟後仍完整保留、日／週／月報表的台北時區日期
區間計算與 Excel 產出邏輯。藍新金流的 AES 加解密邏輯也已用符合規格長度的
測試金鑰驗證過加密→解密往返結果正確。

**尚未測試**的是藍新金流與 pCloud 的**真實帳號**串接——藍新已依使用者指示
暫停處理，pCloud 則卡在 OAuth App 審核中。兩者目前都還是用假資料驗證「程式
邏輯與錯誤處理正確」，尚未跑過真實的下單付款或真實檔案上傳。等這兩項機密
資訊備妥後，務必各自完整跑一次真實流程再視為完全就緒。
