/* 包安心 — 商品資料與購物車核心邏輯（共用於各頁面） */

const PRODUCTS = [
  {
    id: "pants-L",
    type: "內褲式",
    name: "親膚安舒褲 L",
    size: "L 大號",
    image: "assets/images/product-pants-L.jpg",
    pack: 60,
    price: 479,
    fit: "適用臀圍 80–105cm／腰圍 61–110cm",
    soldout: false,
    badgeClass: "badge-pink",
  },
  {
    id: "pants-XL",
    type: "內褲式",
    name: "親膚安舒褲 XL",
    size: "XL 加大號",
    image: "assets/images/product-pants-XL.jpg",
    pack: 60,
    price: 539,
    fit: "適用臀圍 90–120cm／腰圍 71–130cm",
    soldout: false,
    badgeClass: "badge-pink",
  },
  {
    id: "stick-L",
    type: "黏貼式",
    name: "黏貼式紙尿褲 L",
    size: "L 大號",
    image: "assets/images/product-stick-L.jpg",
    pack: 30,
    price: 329,
    fit: "適用臀圍 95–120cm／腰圍 65–120cm",
    soldout: false,
    badgeClass: "",
  },
  {
    id: "stick-XL",
    type: "黏貼式",
    name: "黏貼式紙尿褲 XL",
    size: "XL 加大號",
    image: "assets/images/product-stick-XL.jpg",
    pack: 30,
    price: null,
    fit: "適用臀圍 110–135cm／腰圍 75–135cm",
    soldout: true,
    badgeClass: "",
  },
];

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function formatNT(n) {
  return "NT$" + Math.round(n).toLocaleString("zh-TW");
}

function unitPrice(product) {
  if (!product.price) return null;
  return product.price / product.pack;
}

/* ---------------- Cart (localStorage) ---------------- */
const Cart = {
  KEY: "poh_cart_v1",

  read() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  write(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
    document.dispatchEvent(new CustomEvent("cart:change"));
  },

  add(id, qty) {
    const product = getProduct(id);
    if (!product || product.soldout) return;
    const data = this.read();
    data[id] = (data[id] || 0) + qty;
    this.write(data);
  },

  setQty(id, qty) {
    const data = this.read();
    if (qty <= 0) delete data[id];
    else data[id] = qty;
    this.write(data);
  },

  remove(id) {
    const data = this.read();
    delete data[id];
    this.write(data);
  },

  clear() {
    this.write({});
  },

  lines() {
    const data = this.read();
    return Object.keys(data)
      .map((id) => {
        const product = getProduct(id);
        if (!product) return null;
        return { product, qty: data[id] };
      })
      .filter(Boolean);
  },

  count() {
    return this.lines().reduce((sum, l) => sum + l.qty, 0);
  },

  subtotal() {
    return this.lines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
  },
};
