import mysql from 'mysql2/promise';

const databaseName = process.env.TEST_DB_NAME || 'hb_kalite_kontrol';

let poolPromise;

export async function getTestDbPool() {
  if (!poolPromise) {
    poolPromise = createPool();
  }

  return poolPromise;
}

async function createPool() {
  const baseConfig = getBaseConfig();
  const bootstrap = await mysql.createConnection(baseConfig);

  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrap.end();
  }

  const pool = mysql.createPool({
    ...baseConfig,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: Number(process.env.TEST_DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  await ensureSchema(pool);

  return pool;
}

function getBaseConfig() {
  return {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 3306),
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASSWORD || '',
    connectTimeout: Number(process.env.TEST_DB_TIMEOUT_MS || 8000),
    multipleStatements: false
  };
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_records (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      test_date DATE NULL,
      model VARCHAR(500) NOT NULL DEFAULT '',
      gb VARCHAR(64) NOT NULL DEFAULT '',
      order_code VARCHAR(500) NOT NULL DEFAULT '',
      note LONGTEXT NULL,
      final_status ENUM('ok', 'red') NOT NULL,
      ok_count INT NOT NULL DEFAULT 0,
      red_count INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL,
      INDEX idx_test_records_created_at (created_at),
      INDEX idx_test_records_order_code (order_code),
      INDEX idx_test_records_test_date (test_date)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_record_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      record_id VARCHAR(64) NOT NULL,
      item_order INT NOT NULL,
      name VARCHAR(500) NOT NULL,
      result ENUM('ok', 'red') NOT NULL,
      extra VARCHAR(500) NOT NULL DEFAULT '',
      INDEX idx_test_record_items_record_id (record_id),
      CONSTRAINT fk_test_record_items_record
        FOREIGN KEY (record_id)
        REFERENCES test_records (id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);
}
