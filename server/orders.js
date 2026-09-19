/**
 * 訂單儲存：使用 PostgreSQL（Neon）永久保存，取代原本會在伺服器
 * 重啟／重新部署時遺失的本機 JSON 檔案。訂單整包存成 JSONB，
 * 保留跟原本 orders.json 完全一樣的資料結構，不需要另外設計欄位。
 */
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }
  return schemaReady;
}

function nextOrderId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `POH${stamp}${rand}`;
}

async function saveOrder(order) {
  await ensureSchema();
  await pool.query(
    `INSERT INTO orders (order_id, data, created_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (order_id) DO UPDATE SET data = EXCLUDED.data`,
    [order.orderId, order, order.createdAt || new Date().toISOString()]
  );
  return order;
}

async function getOrder(orderId) {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT data FROM orders WHERE order_id = $1`, [orderId]);
  return rows[0] ? rows[0].data : null;
}

async function updateOrder(orderId, patch) {
  const current = await getOrder(orderId);
  if (!current) return null;
  const updated = { ...current, ...patch };
  await pool.query(`UPDATE orders SET data = $2 WHERE order_id = $1`, [orderId, updated]);
  return updated;
}

async function listOrders() {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT data FROM orders ORDER BY created_at DESC`);
  return rows.map((r) => r.data);
}

/**
 * 列出建立時間落在 [start, end]（含端點）區間內的訂單，依時間由舊到新排序。
 * start / end 可以是 Date 物件或 ISO 字串。
 */
async function listOrdersBetween(start, end) {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT data FROM orders WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at ASC`,
    [start, end]
  );
  return rows.map((r) => r.data);
}

module.exports = { nextOrderId, saveOrder, getOrder, updateOrder, listOrders, listOrdersBetween };
