const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: 'leakshield',
        host: '127.0.0.1',
        database: 'leakshield_db',
        password: 'leakshield_password',
        port: 5432,
      }
);

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      repository_id TEXT,
      commit_sha TEXT,
      status TEXT DEFAULT 'IN_PROGRESS',
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP,
      FOREIGN KEY(repository_id) REFERENCES repositories(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      repository_id TEXT,
      scan_id TEXT,
      commit_sha TEXT,
      file_path TEXT,
      line_start INTEGER,
      line_end INTEGER,
      secret_type TEXT,
      severity TEXT,
      risk_score INTEGER,
      confidence REAL,
      status TEXT DEFAULT 'OPEN',
      fingerprint TEXT,
      context TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(repository_id) REFERENCES repositories(id),
      FOREIGN KEY(scan_id) REFERENCES scans(id)
    )
  `);
}

initDB().catch(console.error);

module.exports = {
  query: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows;
  },
  run: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res;
  }
};
