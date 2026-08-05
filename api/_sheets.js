import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '';
export const PROTECTED_SHEET_NAMES = ['TOPLAM'];

export const COL = {
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

export async function getSheetsClient() {
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

export async function getSearchSheetNames(sheets) {
  const validSheetNames = [];
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties(title)'
  });
  const sheetNames = (metadata.data.sheets || [])
    .map((sheet) => sheet.properties.title)
    .filter((sheetName) => !isProtectedSheetName(sheetName));

  for (const sheetName of sheetNames) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: quoteSheetName(sheetName) + '!A1:N1'
      });

      const header = response.data.values && response.data.values[0] ? response.data.values[0] : [];

      if (normalize(header[COL.formNo]) === 'FORM NO') {
        validSheetNames.push(sheetName);
      }
    } catch (error) {
      if (!String(error.message || '').includes('Unable to parse range')) {
        throw error;
      }
    }
  }

  return validSheetNames;
}

export function getServiceAccountCredentials() {
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

export function quoteSheetName(sheetName) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

export function value(row, index) {
  return String(row[index] || '').trim();
}

export function normalize(text) {
  return String(text || '').trim().toLocaleUpperCase('tr-TR');
}

export function isProtectedSheetName(sheetName) {
  return normalize(sheetName).includes('TOPLAM');
}

export function getPublicError(error) {
  const message = error && error.message ? error.message : 'İşlem sırasında hata oluştu.';

  if (message.includes('Unable to parse range')) {
    return 'Sayfa adı veya aralık bulunamadı.';
  }

  if (message.includes('The caller does not have permission')) {
    return 'Google Sheet erişim izni yok. Sheet dosyasını service account mail adresine paylaşın.';
  }

  if (message.includes('Requested entity was not found')) {
    return 'Google Sheet bulunamadı. SPREADSHEET_ID değerini kontrol edin.';
  }

  return message;
}
