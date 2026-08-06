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
WITH ReportBase AS (
  SELECT
    k.Kayitno,
    k.takipno,
    k.Model,
    k.Durumu,
    k.Teknisyen,
    k.sonislem,
    k.onarbilgi,
    lastMove.ophartarih,
    lastMove.opharsaat,
    lastMove.opharack,
    UPPER(
      REPLACE(
        REPLACE(
          REPLACE(ISNULL(k.onarbilgi, ''), N'İ', N'I'),
          N'ı',
          N'I'
        ),
        N'i',
        N'I'
      )
    ) AS NormalizedRepairText,
    CASE
      WHEN
        NULLIF(LTRIM(RTRIM(ISNULL(k.Teknisyen, ''))), '') IS NULL
        OR UPPER(LTRIM(RTRIM(ISNULL(k.Teknisyen, '')))) = 'MTKSOFT'
      THEN NULLIF(LTRIM(RTRIM(ISNULL(k.sonislem, ''))), '')
      ELSE NULLIF(LTRIM(RTRIM(ISNULL(k.Teknisyen, ''))), '')
    END AS RaporTeknisyen
  FROM Kayit k
  OUTER APPLY (
    SELECT TOP 1
      h.ophartarih,
      h.opharsaat,
      h.opharack
    FROM oprhar h
    WHERE h.opharkayno = k.Kayitno
      AND CAST(h.ophartarih AS date) = @reportDate
      AND (
        UPPER(REPLACE(REPLACE(REPLACE(ISNULL(h.opharack, ''), N'İ', N'I'), N'ı', N'I'), N'i', N'I')) LIKE N'%TAMAMLANDI%'
        OR UPPER(REPLACE(REPLACE(REPLACE(ISNULL(h.opharack, ''), N'İ', N'I'), N'ı', N'I'), N'i', N'I')) LIKE N'%KALITE%'
        OR UPPER(REPLACE(REPLACE(REPLACE(ISNULL(h.opharack, ''), N'İ', N'I'), N'ı', N'I'), N'i', N'I')) LIKE N'%KALITE KONTROL%'
      )
    ORDER BY h.ophartarih DESC, h.opharsaat DESC, h.opharno DESC
  ) lastMove
  WHERE lastMove.ophartarih IS NOT NULL
)
SELECT
  RaporTeknisyen AS teknisyen,
  SUM(
    CASE
      WHEN NormalizedRepairText LIKE N'%ONARILDI%'
       AND NormalizedRepairText NOT LIKE N'%YENILEME%'
      THEN 1
      ELSE 0
    END
  ) AS onarildi,
  SUM(
    CASE
      WHEN NormalizedRepairText LIKE N'%YENILEME%'
      THEN 1
      ELSE 0
    END
  ) AS yenileme,
  COUNT(*) AS toplam
FROM ReportBase
WHERE RaporTeknisyen IS NOT NULL
  AND UPPER(RaporTeknisyen) <> 'MTKSOFT'
  AND (
    NormalizedRepairText LIKE N'%ONARILDI%'
    OR NormalizedRepairText LIKE N'%YENILEME%'
  )
GROUP BY RaporTeknisyen
ORDER BY COUNT(*) DESC, SUM(CASE WHEN NormalizedRepairText LIKE N'%ONARILDI%' THEN 1 ELSE 0 END) DESC, RaporTeknisyen ASC;
    `);

    const rows = result.recordset.map((row) => ({
      teknisyen: row.teknisyen,
      onarildi: Number(row.onarildi || 0),
      yenileme: Number(row.yenileme || 0),
      toplam: Number(row.toplam || 0)
    }));

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
