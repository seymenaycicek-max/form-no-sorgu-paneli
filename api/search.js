import {
  COL,
  SEARCH_SHEET_NAMES,
  SPREADSHEET_ID,
  getPublicError,
  getSheetsClient,
  normalize,
  quoteSheetName,
  value
} from './_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

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

    return res.status(200).json({ results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: getPublicError(error) });
  }
}
