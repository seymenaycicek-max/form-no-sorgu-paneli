import sql from 'mssql';
import {
  getMtkPool,
  getPublicMtkError
} from './_mtk.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed.'
    });
  }

  try {
    const dateText = getDateText(req.query.date);
    const pool = await getMtkPool();
    const request = pool.request();

    request.input('reportDate', sql.Date, dateText);

    const result = await request.query(`
WITH RelevantMoves AS (
  SELECT
    k.Kayitno,
    k.takipno,
    k.Model,
    k.onarbilgi,
    k.Onarbittar,
    h.ophartarih,
    h.opharsaat,
    h.opharno,
    h.opharack,
    NULLIF(LTRIM(RTRIM(ISNULL(h.opharuser, ''))), '') AS RaporTeknisyen,
    UPPER(
      REPLACE(
        REPLACE(
          REPLACE(ISNULL(h.opharuser, ''), N'İ', N'I'),
          N'ı',
          N'I'
        ),
        N'i',
        N'I'
      )
    ) AS NormalizedUser,
    CASE
      WHEN k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%YENILEME%'
        OR k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%YENİLEME%'
      THEN 'yenileme'
      WHEN k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%ONARILDI%'
        OR k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%ONARILDI%'
        OR k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%ARIZA GORULMEDI%'
        OR k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%ARIZA GÖRÜLMEDİ%'
        OR k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%IADE ICIN UYGUN%'
        OR k.onarbilgi COLLATE Turkish_CI_AI LIKE N'%İADE İÇİN UYGUN%'
      THEN 'onarildi'
      ELSE ''
    END AS ResultType,
    ROW_NUMBER() OVER (
      PARTITION BY k.Kayitno
      ORDER BY h.ophartarih ASC, h.opharsaat ASC, h.opharno ASC
    ) AS DeviceRank
  FROM oprhar h
  INNER JOIN Kayit k ON k.Kayitno = h.opharkayno
  WHERE CAST(h.ophartarih AS date) = @reportDate
    AND CAST(k.Onarbittar AS date) = @reportDate
    AND (
      h.opharack COLLATE Turkish_CI_AI LIKE N'%TEST%'
      OR h.opharack COLLATE Turkish_CI_AI LIKE N'%AGIR ARIZA%'
      OR h.opharack COLLATE Turkish_CI_AI LIKE N'%AĞIR ARIZA%'
      OR h.opharack COLLATE Turkish_CI_AI LIKE N'%KALITE KONTROL KALDI%'
      OR h.opharack COLLATE Turkish_CI_AI LIKE N'%KALİTE KONTROL KALDI%'
    )
)
SELECT
  RaporTeknisyen AS teknisyen,
  SUM(CASE WHEN ResultType = 'onarildi' THEN 1 ELSE 0 END) AS onarildi,
  SUM(CASE WHEN ResultType = 'yenileme' THEN 1 ELSE 0 END) AS yenileme
FROM RelevantMoves
WHERE DeviceRank = 1
  AND ResultType IN ('onarildi', 'yenileme')
  AND RaporTeknisyen IS NOT NULL
  AND NormalizedUser <> N'MTKSOFT'
  AND NormalizedUser NOT IN (
    N'UGURCAN SARGIN',
    N'AHMET TASCI',
    N'IYAD SHUMAIS',
    N'AAKAYIT KAPATMA',
    N'AA KAYIT KAPATMA'
  )
GROUP BY RaporTeknisyen
ORDER BY
  SUM(CASE WHEN ResultType IN ('onarildi', 'yenileme') THEN 1 ELSE 0 END) DESC,
  SUM(CASE WHEN ResultType = 'onarildi' THEN 1 ELSE 0 END) DESC,
  RaporTeknisyen ASC;
    `);

    const rows = result.recordset
      .filter((row) => !isBlockedTechnician(row.teknisyen))
      .map((row) => {
        const onarildi = Number(row.onarildi || 0);
        const yenileme = Number(row.yenileme || 0);

        return {
          teknisyen: row.teknisyen,
          onarildi,
          yenileme,
          toplam: onarildi + yenileme
        };
      });

    return res.status(200).json({
      date: dateText,
      rows,
      totals: rows.reduce(
        (totals, row) => ({
          onarildi: totals.onarildi + row.onarildi,
          yenileme: totals.yenileme + row.yenileme,
          toplam: totals.toplam + row.toplam
        }),
        {
          onarildi: 0,
          yenileme: 0,
          toplam: 0
        }
      )
    });
  } catch (error) {
    console.error('MTK rapor API hatası:', error);

    return res.status(500).json({
      error: getPublicMtkError(error)
    });
  }
}

function getDateText(value) {
  const raw = String(value || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return new Date().toISOString().slice(0, 10);
}

function isBlockedTechnician(name) {
  return [
    'AHMETTASCI',
    'IYADSHUMAIS',
    'UGURCANSARGIN',
    'UGURSARGIN',
    'AAKAYITKAPATMA'
  ].includes(normalizeName(name));
}

function normalizeName(value) {
  return String(value || '')
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}
