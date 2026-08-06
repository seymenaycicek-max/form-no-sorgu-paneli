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
WITH TestMoves AS (
  SELECT
    k.Kayitno,
    k.takipno,
    k.Model,
    k.onarbilgi,
    k.Onarbittar,
    h.ophartarih,
    h.opharsaat,
    h.opharack,
    NULLIF(LTRIM(RTRIM(ISNULL(h.opharuser, ''))), '') AS RaporTeknisyen,
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
    UPPER(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(
                        REPLACE(ISNULL(h.opharuser, ''), N'İ', N'I'),
                        N'ı',
                        N'I'
                      ),
                      N'i',
                      N'I'
                    ),
                    N'Ş',
                    N'S'
                  ),
                  N'ş',
                  N'S'
                ),
                N'Ç',
                N'C'
              ),
              N'ç',
              N'C'
            ),
            N'Ğ',
            N'G'
          ),
          N'ğ',
          N'G'
        ),
        N'Ü',
        N'U'
      )
    ) AS NormalizedUser
  FROM oprhar h
  INNER JOIN Kayit k ON k.Kayitno = h.opharkayno
  WHERE CAST(h.ophartarih AS date) = @reportDate
    AND CAST(k.Onarbittar AS date) = @reportDate
    AND UPPER(
      REPLACE(
        REPLACE(
          REPLACE(ISNULL(h.opharack, ''), N'İ', N'I'),
          N'ı',
          N'I'
        ),
        N'i',
        N'I'
      )
    ) LIKE N'%TEST%'
    AND NOT EXISTS (
      SELECT 1
      FROM oprhar failMove
      WHERE failMove.opharkayno = k.Kayitno
        AND (
          failMove.ophartarih > h.ophartarih
          OR (
            failMove.ophartarih = h.ophartarih
            AND ISNULL(failMove.opharsaat, '') >= ISNULL(h.opharsaat, '')
          )
        )
        AND UPPER(
          REPLACE(
            REPLACE(
              REPLACE(ISNULL(failMove.opharack, ''), N'İ', N'I'),
              N'ı',
              N'I'
            ),
            N'i',
            N'I'
          )
        ) LIKE N'%KALDI%'
    )
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
  ) AS yenileme
FROM TestMoves
WHERE RaporTeknisyen IS NOT NULL
  AND NormalizedUser <> N'MTKSOFT'
  AND NormalizedUser NOT IN (
    N'UGURCAN SARGIN',
    N'AHMET TASCI',
    N'IYAD SHUMAIS'
  )
  AND (
    NormalizedRepairText LIKE N'%ONARILDI%'
    OR NormalizedRepairText LIKE N'%YENILEME%'
  )
GROUP BY RaporTeknisyen
ORDER BY
  (
    SUM(CASE WHEN NormalizedRepairText LIKE N'%ONARILDI%' AND NormalizedRepairText NOT LIKE N'%YENILEME%' THEN 1 ELSE 0 END)
    + SUM(CASE WHEN NormalizedRepairText LIKE N'%YENILEME%' THEN 1 ELSE 0 END)
  ) DESC,
  SUM(CASE WHEN NormalizedRepairText LIKE N'%ONARILDI%' THEN 1 ELSE 0 END) DESC,
  RaporTeknisyen ASC;
    `);

    const rows = result.recordset.map((row) => {
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
