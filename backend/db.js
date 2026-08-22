/**
 * db.js – SQLite layer using sql.js (pure JavaScript, no native compilation).
 *
 * sql.js runs SQLite compiled to WebAssembly/asm.js — zero node-gyp issues on
 * Windows, even without Visual Studio Build Tools.
 *
 * Exposes a thin synchronous wrapper that mimics the better-sqlite3 API so all
 * route files can call  db.prepare('…').run(…) / .get(…) / .all(…)  unchanged.
 *
 * Persistence: the in-memory sql.js DB is flushed to disk (dayflow.db) after
 * every write operation so data survives restarts.
 */

'use strict';

const initSqlJs = require('sql.js');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'dayflow.db');

// ---------- bootstrap (synchronous via execSync trick) ----------
// sql.js init is async; we use a sync-ish pattern with a shared state object.

let _db   = null; // sql.js Database instance
let _ready = false;

// We export a Proxy so callers can call db.prepare() etc. before the async
// init resolves — but since Node.js require() is sync, we block with a
// workaround: run init, persist the promise, and throw if called too early.

// Actually: we initialise synchronously via the execSync+child_process trick
// for pure-JS modules. sql.js with asm.js doesn't actually need WebAssembly
// loading time on the critical path when using the asm version. Let's init
// properly using a top-level async IIFE and expose a `dbReady` promise, then
// make server.js await it before starting Express.

let dbReady;   // Promise<void>  – resolved once DB is initialised
let db = null; // the wrapper object (set during init)

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                 */
/* ------------------------------------------------------------------ */

function saveDb(sqlDb) {
  const data = sqlDb.export(); // Uint8Array
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function loadDbFile(sqlDb) {
  if (fs.existsSync(DB_PATH)) {
    const buf  = fs.readFileSync(DB_PATH);
    // Re-open the saved file contents into the existing in-memory DB
    // sql.js doesn't support loading into an existing instance, so we
    // return a new instance instead.
    return new sqlDb.constructor(buf); // won't work – handled in init below
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Statement wrapper – mirrors better-sqlite3 prepared statement API  */
/* ------------------------------------------------------------------ */

function makeStmt(sqlDb, sql) {
  return {
    /** Execute INSERT / UPDATE / DELETE – returns { lastInsertRowid, changes } */
    run(...args) {
      const params = flattenParams(args);
      sqlDb.run(sql, params);
      // lastInsertRowid
      const rowid = sqlDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null;
      const changes = sqlDb.exec('SELECT changes()')[0]?.values[0][0] ?? 0;
      saveDb(sqlDb);
      return { lastInsertRowid: rowid, changes };
    },

    /** Execute SELECT – returns first row as a plain object or undefined */
    get(...args) {
      const params = flattenParams(args);
      const result = sqlDb.exec(sql, params);
      if (!result.length || !result[0].values.length) return undefined;
      return rowToObj(result[0].columns, result[0].values[0]);
    },

    /** Execute SELECT – returns all rows as an array of plain objects */
    all(...args) {
      const params = flattenParams(args);
      const result = sqlDb.exec(sql, params);
      if (!result.length) return [];
      const { columns, values } = result[0];
      return values.map(row => rowToObj(columns, row));
    }
  };
}

function flattenParams(args) {
  // Callers pass either spread args or a single array/object
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

function rowToObj(columns, row) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

/* ------------------------------------------------------------------ */
/*  DB wrapper object (exposed as module.exports)                       */
/* ------------------------------------------------------------------ */

function makeDbWrapper(sqlDb) {
  return {
    prepare(sql) {
      return makeStmt(sqlDb, sql);
    },
    exec(sql) {
      sqlDb.exec(sql);
      saveDb(sqlDb);
    },
    pragma(str) {
      sqlDb.run(`PRAGMA ${str}`);
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Schema                                                              */
/* ------------------------------------------------------------------ */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'employee',
    department TEXT    DEFAULT 'General',
    phone      TEXT,
    address    TEXT,
    salary     REAL    DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    date       TEXT    NOT NULL,
    check_in   TEXT,
    check_out  TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS leaves (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    type       TEXT    NOT NULL,
    start_date TEXT    NOT NULL,
    end_date   TEXT    NOT NULL,
    reason     TEXT,
    status     TEXT    NOT NULL DEFAULT 'Pending',
    created_at TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

/* ------------------------------------------------------------------ */
/*  Initialisation (async – awaited in server.js before listen)        */
/* ------------------------------------------------------------------ */

dbReady = (async () => {
  const SQL = await initSqlJs(); // loads asm.js; no WebAssembly file needed

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    // Load existing DB file
    const buf = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buf);
  } else {
    sqlDb = new SQL.Database();
  }

  // Enable WAL-mode equivalent and foreign keys
  sqlDb.run('PRAGMA foreign_keys = ON');

  // Apply schema
  sqlDb.run(SCHEMA);

  // Seed admin user if not present
  const adminEmail = 'admin@dayflow.com';
  const existingAdmin = sqlDb.exec(
    `SELECT id FROM users WHERE email = '${adminEmail}'`
  );
  if (!existingAdmin.length || !existingAdmin[0].values.length) {
    const hashed = bcrypt.hashSync('Admin@123', 10);
    sqlDb.run(
      `INSERT INTO users (name, email, password, role, department, phone, address, salary)
       VALUES (?, ?, ?, 'admin', 'Management', '9999999999', 'HQ Office', 80000)`,
      ['Admin User', adminEmail, hashed]
    );
    console.log('✅  Admin seeded → admin@dayflow.com / Admin@123');
  }

  // Seed employee user if not present
  const employeeEmail = 'employee@dayflow.com';
  const existingEmployee = sqlDb.exec(
    `SELECT id FROM users WHERE email = '${employeeEmail}'`
  );
  if (!existingEmployee.length || !existingEmployee[0].values.length) {
    const hashed = bcrypt.hashSync('Employee@123', 10);
    sqlDb.run(
      `INSERT INTO users (name, email, password, role, department, phone, address, salary)
       VALUES (?, ?, ?, 'employee', 'Engineering', '8888888888', 'Branch Office', 60000)`,
      ['Employee User', employeeEmail, hashed]
    );
    console.log('✅  Employee seeded → employee@dayflow.com / Employee@123');
  }

  // Persist initial state
  saveDb(sqlDb);

  // Expose the wrapper
  db = makeDbWrapper(sqlDb);
})();

/* ------------------------------------------------------------------ */
/*  Export                                                              */
/* ------------------------------------------------------------------ */

// We export an object with a `ready` promise + a `getDb()` accessor.
// Routes use `getDb()` so they always have the initialised instance.
// Alternatively we expose a Proxy so  require('./db').prepare(...)  works
// once the server waits for dbReady.

module.exports = {
  get ready() { return dbReady; },
  get db()    { return db; },
  /** Shorthand: db.prepare(sql) etc.  Works after await dbReady */
  prepare(sql)    { return db.prepare(sql); },
  exec(sql)       { return db.exec(sql); },
  pragma(str)     { return db.pragma(str); }
};
