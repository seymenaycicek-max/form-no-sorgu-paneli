import {
  getBusinessSheetList,
  getPublicError,
  getSheetsClient,
  getVisibilitySettings,
  hasFormNoHeader,
  isProtectedSheetName,
  setSheetVisibility
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
      const visible = req.body?.visible;

      if (!name) {
        return res.status(400).json({ error: 'Sayfa adı zorunlu.' });
      }

      if (typeof visible !== 'boolean') {
        return res.status(400).json({ error: 'Göster/gizle değeri geçersiz.' });
      }

      if (isProtectedSheetName(name)) {
        return res.status(400).json({ error: `${name} sorguda gösterilemez.` });
      }

      const sheetList = await getBusinessSheetList(sheets);
      const target = sheetList.find((sheet) => sheet.name === name);

      if (!target) {
        return res.status(404).json({ error: 'Sayfa bulunamadı.' });
      }

      await setSheetVisibility(sheets, name, visible);

      const updatedSheetList = await getSheetList(sheets);
      return res.status(200).json({
        ok: true,
        sheets: updatedSheetList,
        message: visible ? `${name} sorguda gösterilecek.` : `${name} sorguda gizlenecek.`
      });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: getPublicError(error) });
  }
}

async function getSheetList(sheets) {
  const businessSheets = await getBusinessSheetList(sheets);
  const settings = await getVisibilitySettings(sheets);
  const result = [];

  for (const sheet of businessSheets) {
    const eligible = !sheet.protected && await hasFormNoHeader(sheets, sheet.name);
    const visible = sheet.protected ? false : settings.get(sheet.name) !== false;

    result.push({
      id: sheet.id,
      name: sheet.name,
      protected: sheet.protected,
      eligible,
      visible
    });
  }

  return result;
}
