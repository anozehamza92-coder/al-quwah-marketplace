const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDirectory = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDirectory, { recursive: true });
const databasePath = process.env.SQLITE_DB_PATH || path.join(dataDirectory, "marketplace.db");
const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

console.log("AL-QUWWA HOME MARKETPLACE database connected.");

module.exports = db;
// ==========================================
// DATABASE TABLES
// ==========================================

// USERS TABLE
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'buyer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ASSETS TABLE
db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT,
    location TEXT,
    price TEXT,
    contact TEXT,
    description TEXT,
    investment_highlight TEXT,
    image TEXT,
    video TEXT,
    approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// PROFESSIONALS TABLE
db.exec(`
  CREATE TABLE IF NOT EXISTS professionals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    email TEXT,
    description TEXT,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

console.log("AL-QUWWA HOME MARKETPLACE database tables are ready.");