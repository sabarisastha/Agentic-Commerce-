const Database = require('better-sqlite3');
const path = require('path');
const productsSeed = require('../catalog/seed');

const dbPath = path.join(__dirname, '../../catalog.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    ram_gb INTEGER,
    storage_gb INTEGER,
    weight_kg REAL,
    brand TEXT,
    tags TEXT, -- Stored as JSON string
    image_url TEXT,
    description TEXT,
    rating REAL DEFAULT 4.3
  );

  CREATE TABLE IF NOT EXISTS CartItem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_add INTEGER,
    FOREIGN KEY (product_id) REFERENCES Product(id)
  );

  CREATE TABLE IF NOT EXISTS Session (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Orders (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    idempotency_key TEXT,
    total_amount INTEGER,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES Session(id)
  );

  CREATE TABLE IF NOT EXISTS AuditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    event_type TEXT,
    payload TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ConversationMessage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    tool_calls TEXT,
    tool_call_id TEXT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Passkey (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed data if Product table is empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM Product');
const row = countStmt.get();

if (row.count === 0) {
  console.log('Seeding Product database...');
  const insert = db.prepare(`
    INSERT INTO Product (id, name, category, price, stock, ram_gb, storage_gb, weight_kg, brand, tags, image_url, description)
    VALUES (@id, @name, @category, @price, @stock, @ram_gb, @storage_gb, @weight_kg, @brand, @tags, @image_url, @description)
  `);

  const insertMany = db.transaction((products) => {
    for (const p of products) {
      insert.run({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        ram_gb: p.ram_gb || null,
        storage_gb: p.storage_gb || null,
        weight_kg: p.weight_kg || null,
        brand: p.brand || null,
        tags: JSON.stringify(p.tags || []),
        image_url: p.image_url || null,
        description: p.description || null
      });
    }
  });

  insertMany(productsSeed);
  console.log('Seed complete.');
}

module.exports = db;
