/**
 * 伺服器端商品目錄（與 public/js/data.js 內容一致）。
 * 金額一律以此檔案為準重新計算，避免信任前端送來的價格。
 */
const PRODUCTS = {
  "pants-L": { name: "親膚安舒褲 L", price: 479, soldout: false },
  "pants-XL": { name: "親膚安舒褲 XL", price: 539, soldout: false },
  "stick-L": { name: "黏貼式紙尿褲 L", price: 329, soldout: false },
  "stick-XL": { name: "黏貼式紙尿褲 XL", price: null, soldout: true },
};

const COD_SHIPPING_FEE = 60;

module.exports = { PRODUCTS, COD_SHIPPING_FEE };
