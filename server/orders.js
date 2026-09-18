/**
 * 極簡訂單儲存：以 JSON 檔案落地，僅供開發／小量營運示範使用。
 * 正式上線建議換成真正的資料庫（PostgreSQL / MySQL / SQLite 等）。
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "orders.json");

function readAll() {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    return {};
  }
}

function writeAll(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

function nextOrderId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `POH${stamp}${rand}`;
}

function saveOrder(order) {
  const all = readAll();
  all[order.orderId] = order;
  writeAll(all);
  return order;
}

function getOrder(orderId) {
  const all = readAll();
  return all[orderId] || null;
}

function updateOrder(orderId, patch) {
  const all = readAll();
  if (!all[orderId]) return null;
  all[orderId] = { ...all[orderId], ...patch };
  writeAll(all);
  return all[orderId];
}

module.exports = { nextOrderId, saveOrder, getOrder, updateOrder };
