import { getTechnicianTestDbPool } from './_technicianTestDb.js';

const maxRecords = 5000;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const records = await readRecords(clampLimit(req.query.limit));

      return res.status(200).json({ records });
    }

    if (req.method === 'POST') {
      const record = normalizeRecord(req.body);

      if (!record.items.length) {
        return res.status(400).json({
          error: 'Kaydedilecek teknisyen testi bulunamadi.'
        });
      }

      const savedRecord = await saveRecord(record);

      return res.status(201).json({ record: savedRecord });
    }

    return res.status(405).json({
      error: 'Method not allowed.'
    });
  } catch (error) {
    console.error('Teknisyen test kaydi hatasi:', error);

    return res.status(500).json({
      error: 'Teknisyen test kaydi islenirken hata olustu.'
    });
  }
}

async function readRecords(limit) {
  const pool = await getTechnicianTestDbPool();
  const [recordRows] = await pool.query(
    `
      SELECT
        id,
        DATE_FORMAT(test_date, '%Y-%m-%d') AS date,
        model,
        gb,
        order_code AS orderCode,
        note,
        final_status AS finalStatus,
        ok_count AS okCount,
        red_count AS redCount,
        created_at AS createdAt
      FROM technician_test_records
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [limit]
  );

  if (!recordRows.length) {
    return [];
  }

  const recordIds = recordRows.map((record) => record.id);
  const [itemRows] = await pool.query(
    `
      SELECT
        record_id AS recordId,
        name,
        result,
        extra
      FROM technician_test_record_items
      WHERE record_id IN (?)
      ORDER BY record_id, item_order
    `,
    [recordIds]
  );

  const itemsByRecordId = new Map();

  itemRows.forEach((item) => {
    if (!itemsByRecordId.has(item.recordId)) {
      itemsByRecordId.set(item.recordId, []);
    }

    itemsByRecordId.get(item.recordId).push({
      name: item.name,
      result: item.result,
      extra: item.extra
    });
  });

  return recordRows.map((record) => ({
    ...record,
    note: record.note || '',
    createdAt: formatDateTime(record.createdAt),
    items: itemsByRecordId.get(record.id) || []
  }));
}

async function saveRecord(record) {
  const pool = await getTechnicianTestDbPool();
  const connection = await pool.getConnection();
  const savedRecord = {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...record
  };

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        INSERT INTO technician_test_records (
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
      `,
      [
        savedRecord.id,
        normalizeSqlDate(savedRecord.date),
        savedRecord.model,
        savedRecord.gb,
        savedRecord.orderCode,
        savedRecord.note,
        savedRecord.finalStatus,
        savedRecord.okCount,
        savedRecord.redCount,
        formatSqlDateTime(savedRecord.createdAt)
      ]
    );

    await connection.query(
      `
        INSERT INTO technician_test_record_items (
          record_id,
          item_order,
          name,
          result,
          extra
        )
        VALUES ?
      `,
      [
        savedRecord.items.map((item, index) => [
          savedRecord.id,
          index + 1,
          item.name,
          item.result,
          item.extra
        ])
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await trimOldRecords();

  return savedRecord;
}

async function trimOldRecords() {
  const pool = await getTechnicianTestDbPool();

  await pool.query(
    `
      DELETE FROM technician_test_records
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id
          FROM technician_test_records
          ORDER BY created_at DESC
          LIMIT ?
        ) AS latest_records
      )
    `,
    [maxRecords]
  );
}

function normalizeRecord(body = {}) {
  const items = Array.isArray(body.items)
    ? body.items
      .map((item) => ({
        name: cleanText(item.name),
        result: cleanResult(item.result),
        extra: cleanText(item.extra)
      }))
      .filter((item) => item.name && item.result)
    : [];

  const redCount = items.filter((item) => item.result === 'red').length;
  const okCount = items.filter((item) => item.result === 'ok').length;

  return {
    date: cleanText(body.date),
    model: cleanText(body.model),
    gb: cleanText(body.gb),
    orderCode: cleanText(body.orderCode),
    note: cleanLongText(body.note),
    finalStatus: redCount > 0 ? 'red' : 'ok',
    okCount,
    redCount,
    items
  };
}

function cleanText(value) {
  return String(value || '').trim().slice(0, 500);
}

function cleanLongText(value) {
  return String(value || '').trim();
}

function cleanResult(value) {
  return value === 'red' ? 'red' : value === 'ok' ? 'ok' : '';
}

function clampLimit(value) {
  const limit = Number(value || 100);

  if (!Number.isFinite(limit)) {
    return 100;
  }

  return Math.max(1, Math.min(500, Math.floor(limit)));
}

function createId() {
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10)
  ].join('-');
}

function normalizeSqlDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function formatSqlDateTime(value) {
  return new Date(value).toISOString().slice(0, 23).replace('T', ' ');
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString();
}
