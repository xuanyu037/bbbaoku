/**
 * 藍新金流（NewebPay）MPG 全支付方式 API 加解密工具。
 *
 * 規則（依藍新官方文件）：
 *  - TradeInfo：將交易參數組成 querystring 後，以 AES-256-CBC
 *    （key = HashKey，iv = HashIV，PKCS7 padding）加密，輸出 16 進位小寫字串。
 *  - TradeSha：SHA256( `HashKey=${HashKey}&${TradeInfo}&HashIV=${HashIV}` )，
 *    輸出 16 進位大寫字串，用於讓藍新驗證我方送出的內容未被竄改。
 *  - 解密（Notify / Return 回傳）則反向執行 AES-256-CBC 解密。
 *
 * 商店的 MerchantID / HashKey / HashIV 屬機密資訊，一律從環境變數讀取，
 * 絕對不要寫在程式碼或前端頁面中。
 */
const crypto = require("crypto");
const qs = require("querystring");

function getConfig() {
  const { NEWEBPAY_MERCHANT_ID, NEWEBPAY_HASHKEY, NEWEBPAY_HASHIV, NEWEBPAY_MPG_URL } = process.env;
  if (!NEWEBPAY_MERCHANT_ID || !NEWEBPAY_HASHKEY || !NEWEBPAY_HASHIV) {
    throw new Error(
      "尚未設定藍新金流環境變數（NEWEBPAY_MERCHANT_ID / NEWEBPAY_HASHKEY / NEWEBPAY_HASHIV），請參考 server/.env.example 設定 .env 後再啟用線上結帳。"
    );
  }
  return {
    merchantId: NEWEBPAY_MERCHANT_ID,
    hashKey: NEWEBPAY_HASHKEY,
    hashIv: NEWEBPAY_HASHIV,
    mpgUrl: NEWEBPAY_MPG_URL || "https://ccore.newebpay.com/MPG/mpg_gateway",
  };
}

function encryptTradeInfo(params, hashKey, hashIv) {
  const plain = qs.stringify(params);
  const cipher = crypto.createCipheriv("aes-256-cbc", hashKey, hashIv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return encrypted.toString("hex");
}

function decryptTradeInfo(tradeInfoHex, hashKey, hashIv) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", hashKey, hashIv);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(tradeInfoHex, "hex")),
    decipher.final(),
  ]);
  return qs.parse(decrypted.toString("utf8"));
}

function computeTradeSha(tradeInfoHex, hashKey, hashIv) {
  const raw = `HashKey=${hashKey}&${tradeInfoHex}&HashIV=${hashIv}`;
  return crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
}

function verifyTradeSha(tradeInfoHex, tradeSha, hashKey, hashIv) {
  return computeTradeSha(tradeInfoHex, hashKey, hashIv) === String(tradeSha).toUpperCase();
}

/**
 * 建立送往藍新 MPG 收銀台的表單參數。
 * order: { orderId, amount, itemDesc, email }
 * urls: { returnUrl, notifyUrl, clientBackUrl }
 */
function buildMpgFields(order, urls) {
  const { merchantId, hashKey, hashIv, mpgUrl } = getConfig();

  const tradeParams = {
    MerchantID: merchantId,
    RespondType: "JSON",
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
    Version: "2.0",
    MerchantOrderNo: order.orderId,
    Amt: Math.round(order.amount),
    ItemDesc: order.itemDesc.slice(0, 50),
    Email: order.email || "",
    LoginType: "0",
    ReturnURL: urls.returnUrl,
    NotifyURL: urls.notifyUrl,
    ClientBackURL: urls.clientBackUrl,
  };

  const tradeInfo = encryptTradeInfo(tradeParams, hashKey, hashIv);
  const tradeSha = computeTradeSha(tradeInfo, hashKey, hashIv);

  return {
    mpgUrl,
    fields: {
      MerchantID: merchantId,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha,
      Version: "2.0",
    },
  };
}

module.exports = {
  getConfig,
  encryptTradeInfo,
  decryptTradeInfo,
  computeTradeSha,
  verifyTradeSha,
  buildMpgFields,
};
