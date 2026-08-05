import {
  PROTECTED_SHEET_NAMES,
  SPREADSHEET_ID,
  getPublicError,
  getSheetsClient
} from './_sheets.js';

export default async function handler(req, res) {
  try {
    const sheets = await getSheetsClient();

    if (req.method === 'GET') {
      const sheetList = await getSheetList(sheets);
      return res.status(200).json({ sheets: sheetList });
    }

    if (req.method === 'POST') {
      const name = String(req.body.name || '').trim();

      if (!name) {
        return res.status(400).json({ error: 'Sayfa adı zorunlu.' });
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: name
                }
              }
            }
          ]
        }
      });

      const sheetList = await getSheetList(sheets);
      return res.status(200).json({ ok: true, sheets: sheetList, message: `${name} sayfası eklendi.` });
    }

    if (req.method === 'DELETE') {
      const name = String(req.query.name || '').trim();

      if (!name) {
        return res.status(400).json({ error: 'Silinecek sayfa adı zorunlu.' });
      }

      if (PROTECTED_SHEET_NAMES.includes(name)) {
        return res.status(400).json({ error: `${name} sayfası korunuyor, silinemez.` });
      }

      const sheetList = await getSheetList(sheets);
      const target = sheetList.find((sheet) => sheet.name === name);

      if (!target) {
        return res.status(404).json({ error: 'Sayfa bulunamadı.' });
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: target.id
              }
            }
          ]
        }
      });

      const updatedSheetList = await getSheetList(sheets);
      return res.status(200).json({ ok: true, sheets: updatedSheetList, message: `${name} sayfası silindi.` });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: getPublicError(error) });
  }
}

async function getSheetList(sheets) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties(sheetId,title)'
  });

  return (metadata.data.sheets || [])
    .map((sheet) => ({
      id: sheet.properties.sheetId,
      name: sheet.properties.title,
      protected: PROTECTED_SHEET_NAMES.includes(sheet.properties.title)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}
