import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = process.env.TEST_RECORDS_DIR ||
  (
    process.env.VERCEL
      ? path.join(os.tmpdir(), 'hb-kalite-kontrol')
      : path.join(__dirname, '..', 'data')
  );
const dbPath = path.join(dataDir, 'test-records.json');
const maxRecords = 5000;

let writeQueue = Promise.resolve();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const records = await readRecords();
      const limit = clampLimit(req.query.limit);

      return res.status(200).json({
        records: records.slice(0, limit)
      });
    }

    if (req.method === 'POST') {
      const record = normalizeRecord(req.body);

      if (!record.items.length) {
        return res.status(400).json({
          error: 'Kaydedilecek test bulunamadi.'
        });
      }

      const savedRecord = await enqueueWrite(record);

      return res.status(201).json({
        record: savedRecord
      });
    }

    return res.status(405).json({
      error: 'Method not allowed.'
    });
  } catch (error) {
    console.error('Test kaydi hatasi:', error);

    return res.status(500).json({
      error: 'Test kaydi islenirken hata olustu.'
    });
  }
}

async function enqueueWrite(record) {
  const operation = writeQueue.catch(() => {}).then(async () => {
    const records = await readRecords();
    const savedRecord = {
      id: createId(),
      createdAt: new Date().toISOString(),
      ...record
    };

    const nextRecords = [
      savedRecord,
      ...records
    ].slice(0, maxRecords);

    await fs.mkdir(dataDir, {
      recursive: true
    });

    await fs.writeFile(
      dbPath,
      `${JSON.stringify(nextRecords, null, 2)}\n`,
      'utf8'
    );

    return savedRecord;
  });

  writeQueue = operation.catch(() => {});

  return operation;
}

async function readRecords() {
  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    const records = JSON.parse(raw);

    return Array.isArray(records) ? records : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
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
    note: cleanText(body.note),
    finalStatus: redCount > 0 ? 'red' : 'ok',
    okCount,
    redCount,
    items
  };
}

function cleanText(value) {
  return String(value || '').trim().slice(0, 500);
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
