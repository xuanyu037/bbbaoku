# 包安心 Peace of Mind 官網

台灣製成人紙尿褲品牌「包安心」的購物網站。前台為純靜態 HTML/CSS/JS（`public/`），
後台為 Node.js + Express 小型服務（`server/`），負責建立訂單與串接藍新金流（NewebPay）MPG。

## 目錄結構

```
包安心官網/
├── public/                 前台網站（靜態檔案，由 server 或任意靜態伺服器提供）
│   ├── index.html          首頁：影片、訂購須知彈窗、商品選購、品牌故事、尺寸指南、FAQ
│   ├── checkout.html       結帳頁：收件資訊、貨到付款／線上結帳
│   ├── order-result.html   結帳完成後的結果頁
│   ├── css/style.css
│   ├── js/data.js          商品資料 + 購物車（localStorage）
│   ├── js/main.js          導覽列、訂購須知彈窗、購物車側欄
│   ├── js/home.js          首頁商品渲染、FAQ 手風琴、影片控制
│   ├── js/checkout.js      結帳頁邏輯、送出訂單、導向藍新金流
│   └── assets/             商品圖片與介紹影片
└── server/                 後端（Node.js / Express）
    ├── server.js           API 路由
    ├── newebpay.js          藍新金流 AES 加解密與簽章
    ├── products.js          伺服器端商品目錄（金額以此為準）
    ├── orders.js            訂單存取（JSON 檔案，示範用）
    ├── package.json
    └── .env.example         環境變數範例
```

## 功能對照需求

- ✅ 兩種結帳方式：**貨到付款**（+NT$60 運費）／**線上結帳**（免運費，藍新金流）
- ✅ 藍新金流 MPG 全支付方式 API 串接（AES-256-CBC 加密 TradeInfo + SHA256 簽章）
- ✅ 首頁開頭嵌入並自動播放介紹影片（`assets/video/intro.mp4`，靜音自動播放＋可切換聲音）
- ✅ 首次進站自動彈出「訂購須知」視窗，提供明確關閉按鈕，並記住已讀狀態
- ✅ 導覽列選單滑鼠懸停時，項目有放大＋底線的流暢過場動畫
- ✅ 四款商品：安舒褲 L／XL、黏貼式 L、黏貼式 XL（缺貨中，加入購物車按鈕已停用）
- ✅ 每款商品價格旁自動換算並顯示「約 NT$X／片」的單片價格
- ✅ 強調台灣製造與他牌差異（品牌故事段落：價格優勢＋日系規格用料）
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

## 尚未驗證的部分

此環境沒有安裝 Node.js，因此**後端 API 與藍新金流串接流程只完成程式撰寫，
尚未實際執行測試**（前台頁面已用靜態伺服器實測：訂購須知彈窗、影片自動播放、
導覽列放大動效、商品選購、購物車與結帳頁金額試算皆正常）。安裝 Node.js 後，
建議依上方步驟啟動伺服器，並用藍新金流提供的**測試商店帳號**完整跑一次
下單 → 導向收銀台 → 付款 → 導回結果頁的流程，確認無誤後才正式上線。
