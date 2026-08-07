import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTestDbPool } from '../api/_testDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = process.env.TEST_RECORDS_JSON_PATH ||
  path.join(__dirname, '..', 'data', 'test-records.json');

const raw = await fs.readFile(jsonPath, 'utf8');
const records = JSON.parse(raw);

if (!Array.isArray(records)) {
  throw new Error('JSON kayıt dosyası liste formatında değil.');
}

const pool = await getTestDbPool();
const connection = await pool.getConnection();

try {
  await connection.beginTransaction();

  for (const record of records) {
    const id = cleanText(record.id) || createId();
    const items = Array.isArray(record.items)
      ? record.items
        .map((item) => ({
          name: cleanText(item.name),
          result: cleanResult(item.result),
          extra: cleanText(item.extra)
        }))
        .filter((item) => item.name && item.result)
      : [];

    if (!items.length) {
      continue;
    }

    const redCount = Number(record.redCount ?? items.filter((item) => item.result === 'red').length);
    const okCount = Number(record.okCount ?? items.filter((item) => item.result === 'ok').length);

    await connection.query(
      `
        INSERT INTO test_records (
          id,
          test_date,
          model,
          gb,
          order_code,
          note,
          final_status,
          ok_count,
          red_count,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          test_date = VALUES(test_date),
          model = VALUES(model),
          gb = VALUES(gb),
          order_code = VALUES(order_code),
          note = VALUES(note),
          final_status = VALUES(final_status),
          ok_count = VALUES(ok_count),
          red_count = VALUES(red_count),
          created_at = VALUES(created_at)
      `,
      [
        id,
        normalizeSqlDate(cleanText(record.date)),
        cleanText(record.model),
        cleanText(record.gb),
        cleanText(record.orderCode),
        String(record.note || '').trim(),
        cleanResult(record.finalStatus) || (redCount > 0 ? 'red' : 'ok'),
        Number.isFinite(okCount) ? okCount : 0,
        Number.isFinite(redCount) ? redCount : 0,
        formatSqlDateTime(record.createdAt || new Date().toISOString())
      ]
    );

    await connection.query(
      'DELETE FROM test_record_items WHERE record_id = ?',
      [id]
    );

    await connection.query(
      `
        INSERT INTO test_record_items (
          record_id,
          item_order,
          name,
          result,
          extra
        )
        VALUES ?
      `,
      [
        items.map((item, index) => [
          id,
          index + 1,
          item.name,
          item.result,
          item.extra
        ])
      ]
    );
  }

  await connection.commit();
  console.log(`${records.length} JSON kayıt kontrol edildi ve MySQL'e aktarıldı.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}

function cleanText(value) {
  return String(value || '').trim().slice(0, 500);
}

function cleanResult(value) {
  return value === 'red' ? 'red' : value === 'ok' ? 'ok' : '';
}

function normalizeSqlDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function formatSqlDateTime(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ');
}

function createId() {
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10)
  ].join('-');
}
