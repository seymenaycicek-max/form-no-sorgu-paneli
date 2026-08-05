import {
  SEARCH_SHEET_NAMES,
  SPREADSHEET_ID,
  getPublicError,
  getSheetsClient,
  quoteSheetName
} from './_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

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

    return res.status(200).json({
      ok: true,
      message: `${sheetName} sayfasında O${rowNumber} hücresine Tamamlandı yazıldı.`
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: getPublicError(error) });
  }
}
