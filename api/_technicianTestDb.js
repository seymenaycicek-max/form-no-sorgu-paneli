import { getTestDbPool } from './_testDb.js';

let schemaReady;

export async function getTechnicianTestDbPool() {
  const pool = await getTestDbPool();

  if (!schemaReady) {
    schemaReady = ensureTechnicianSchema(pool);
  }

  await schemaReady;

  return pool;
}

async function ensureTechnicianSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS technician_test_records (
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
      INDEX idx_technician_test_records_created_at (created_at),
      INDEX idx_technician_test_records_order_code (order_code),
      INDEX idx_technician_test_records_test_date (test_date)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS technician_test_record_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      record_id VARCHAR(64) NOT NULL,
      item_order INT NOT NULL,
      name VARCHAR(500) NOT NULL,
      result ENUM('ok', 'red') NOT NULL,
      extra VARCHAR(500) NOT NULL DEFAULT '',
      INDEX idx_technician_test_record_items_record_id (record_id),
      CONSTRAINT fk_technician_test_record_items_record
        FOREIGN KEY (record_id)
        REFERENCES technician_test_records (id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);
}
