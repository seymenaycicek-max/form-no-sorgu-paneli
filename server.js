import 'dotenv/config';
import express from 'express';
import { google } from 'googleapis';

const app = express();
const port = Number(process.env.PORT || 3000);

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '';
const SEARCH_SHEET_NAMES = ['AĞUSTOS', 'Renk Değişenler'];

const COL = {
  date: 0,
  formNo: 1,
  model: 2,
  imei: 3,
  color: 4,
  status: 8,
  reason: 10,
  note: 11,
  technician: 12,
  tester: 13,
  completed: 14
};

app.use(express.json());
app.use(express.static('public'));

app.get('/api/search', async (req, res) => {
  try {
    const formNo = String(req.query.formNo || '').trim();

    if (!formNo) {
      return res.status(400).json({ error: 'Form no zorunlu.' });
    }

    const sheets = await getSheetsClient();
    const normalizedFormNo = normalize(formNo);
    const results = [];

    for (const sheetName of SEARCH_SHEET_NAMES) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: quoteSheetName(sheetName) + '!A2:O'
      });

      const rows = response.data.values || [];

      rows.forEach((row, index) => {
        const rowFormNo = value(row, COL.formNo);

        if (normalize(rowFormNo) !== normalizedFormNo) {
          return;
        }

        results.push({
          sheetName,
          rowNumber: index + 2,
          tarih: value(row, COL.date),
          formNo: rowFormNo,
          model: value(row, COL.model),
          imei: value(row, COL.imei),
          renk: value(row, COL.color),
          durum: value(row, COL.status),
          kaldiSebebi: value(row, COL.reason),
          not: value(row, COL.note),
          teknisyen: value(row, COL.technician),
          kaliteKontrol: value(row, COL.tester),
          tamamlandi: value(row, COL.completed)
        });
      });
    }

    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: getPublicError(error) });
  }
});

app.post('/api/complete', async (req, res) => {
  try {
    const sheetName = String(req.body.sheetName || '').trim();
    const rowNumber = Number(req.body.rowNumber);

    if (!SEARCH_SHEET_NAMES.includes(sheetName)) {
      return res.status(400).json({ error: 'Geçersiz sayfa.' });
    }

    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      return res.status(400).json({ error: 'Geçersiz satır.' });
    }

    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: quoteSheetName(sheetName) + `!O${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Tamamlandı']]
      }
    });

    res.json({ ok: true, message: `${sheetName} sayfasında O${rowNumber} hücresine Tamamlandı yazıldı.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: getPublicError(error) });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Form No Sorgu Paneli http://localhost:${port} adresinde çalışıyor.`);
});

async function getSheetsClient() {
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID eksik.');
  }

  const credentials = getServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

function getServiceAccountCredentials() {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!rawJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON eksik.');
  }

  const credentials = JSON.parse(rawJson);

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  return credentials;
}

function quoteSheetName(sheetName) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

function value(row, index) {
  return String(row[index] || '').trim();
}

function normalize(text) {
  return String(text || '').trim().toLocaleUpperCase('tr-TR');
}

function getPublicError(error) {
  const message = error && error.message ? error.message : 'İşlem sırasında hata oluştu.';

  if (message.includes('Unable to parse range')) {
    return 'Sayfa adı veya aralık bulunamadı.';
  }

  if (message.includes('The caller does not have permission')) {
    return 'Google Sheet erişim izni yok. Sheet dosyasını service account mail adresine paylaşın.';
  }

  return message;
}
