import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '';
export const SETTINGS_SHEET_NAME = '_PANEL_AYARLAR';

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
  const sheetList = await getBusinessSheetList(sheets);
  const settings = await getVisibilitySettings(sheets);
  const validSheetNames = [];

  for (const sheet of sheetList) {
    if (sheet.protected) {
      continue;
    }

    if (settings.get(sheet.name) === false) {
      continue;
    }

    if (await hasFormNoHeader(sheets, sheet.name)) {
      validSheetNames.push(sheet.name);
    }
  }

  return validSheetNames;
}

export async function getBusinessSheetList(sheets) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties(sheetId,title,hidden)'
  });

  return (metadata.data.sheets || [])
    .map((sheet) => ({
      id: sheet.properties.sheetId,
      name: sheet.properties.title,
      hidden: Boolean(sheet.properties.hidden),
      protected: isProtectedSheetName(sheet.properties.title)
    }))
    .filter((sheet) => !isInternalSheetName(sheet.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export async function getVisibilitySettings(sheets) {
  await ensureSettingsSheet(sheets);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: quoteSheetName(SETTINGS_SHEET_NAME) + '!A2:B'
  });

  const settings = new Map();

  for (const row of response.data.values || []) {
    const sheetName = value(row, 0);
    const visibleValue = normalize(value(row, 1));

    if (!sheetName) {
      continue;
    }

    settings.set(sheetName, visibleValue !== 'HAYIR');
  }

  return settings;
}

export async function setSheetVisibility(sheets, sheetName, visible) {
  await ensureSettingsSheet(sheets);
  const settings = await getVisibilitySettings(sheets);
  settings.set(sheetName, Boolean(visible));

  const businessSheets = await getBusinessSheetList(sheets);
  const rows = businessSheets.map((sheet) => [
    sheet.name,
    settings.get(sheet.name) === false ? 'Hayır' : 'Evet'
  ]);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: quoteSheetName(SETTINGS_SHEET_NAME) + '!A2:B'
  });

  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: quoteSheetName(SETTINGS_SHEET_NAME) + '!A2:B',
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    });
  }
}

export async function hasFormNoHeader(sheets, sheetName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: quoteSheetName(sheetName) + '!A1:N1'
    });

    const header = response.data.values && response.data.values[0] ? response.data.values[0] : [];
    return normalize(header[COL.formNo]) === 'FORM NO';
  } catch (error) {
    if (String(error.message || '').includes('Unable to parse range')) {
      return false;
    }

    throw error;
  }
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

export function isInternalSheetName(sheetName) {
  return sheetName === SETTINGS_SHEET_NAME;
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

async function ensureSettingsSheet(sheets) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties(sheetId,title,hidden)'
  });

  const existing = (metadata.data.sheets || []).find((sheet) => sheet.properties.title === SETTINGS_SHEET_NAME);

  if (existing) {
    if (!existing.properties.hidden) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: existing.properties.sheetId,
                  hidden: true
                },
                fields: 'hidden'
              }
            }
          ]
        }
      });
    }

    return;
  }

  const created = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: SETTINGS_SHEET_NAME,
              hidden: true
            }
          }
        }
      ]
    }
  });

  const sheetId = created.data.replies?.[0]?.addSheet?.properties?.sheetId;

  if (typeof sheetId === 'number') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: quoteSheetName(SETTINGS_SHEET_NAME) + '!A1:B1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Sayfa', 'Göster']]
      }
    });
  }
}
