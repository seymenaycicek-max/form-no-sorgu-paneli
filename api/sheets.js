import {
  SPREADSHEET_ID,
  getPublicError,
  getSheetsClient,
  isProtectedSheetName
} from './_sheets.js';

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const sheets = await getSheetsClient();

    if (req.method === 'GET') {
      const sheetList = await getSheetList(sheets);
      return res.status(200).json({ sheets: sheetList });
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();

      if (!name) {
        return res.status(400).json({ error: 'Sayfa adı zorunlu.' });
      }

      const sheetList = await getSheetList(sheets);
      const exists = sheetList.some((sheet) => sheet.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'));

      if (exists) {
        return res.status(400).json({ error: `${name} sayfası zaten var.` });
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

      const updatedSheetList = await getSheetList(sheets);
      return res.status(200).json({ ok: true, sheets: updatedSheetList, message: `${name} sayfası eklendi.` });
    }

    if (req.method === 'DELETE') {
      const name = getDeleteName(req);

      if (!name) {
        return res.status(400).json({ error: 'Silinecek sayfa adı zorunlu.' });
      }

      if (isProtectedSheetName(name)) {
        return res.status(400).json({ error: `${name} sayfası korunuyor, silinemez.` });
      }

      const sheetList = await getSheetList(sheets);
      const target = sheetList.find((sheet) => sheet.name === name);

      if (!target) {
        return res.status(404).json({ error: 'Sayfa bulunamadı.' });
      }

      if (sheetList.length <= 1) {
        return res.status(400).json({ error: 'Son sayfa silinemez.' });
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
      protected: isProtectedSheetName(sheet.properties.title)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

function getDeleteName(req) {
  if (req.query?.name) {
    return String(req.query.name).trim();
  }

  try {
    const url = new URL(req.url || '', 'http://localhost');
    return String(url.searchParams.get('name') || '').trim();
  } catch {
    return '';
  }
}
