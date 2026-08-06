# Form No Sorgu Paneli

Bu uygulama Google Sheet dosyasini herkese acmadan Form No sorgusu yapar.

## Google Cloud kurulumu

1. Google Cloud Console'da bir proje ac.
2. `Google Sheets API` etkinlestir.
3. `Service account` olustur.
4. Service account icin JSON key indir.
5. Google Sheet dosyasini service account `client_email` adresine `Editor` olarak paylas.

## Ortam degiskenleri

`.env.example` dosyasini `.env` olarak kopyala ve doldur:

```env
PORT=3000
SPREADSHEET_ID=Google Sheet ID
GOOGLE_SERVICE_ACCOUNT_JSON=Service account JSON tek satir
```

`GOOGLE_SERVICE_ACCOUNT_JSON` icin JSON dosyasinin tamamini tek satir olarak koyabilirsin. `private_key` icindeki `\n` karakterleri korunmali.

## Calistirma

```bash
npm install
npm start
```

Panel:

```text
http://localhost:3000
```

MTK teknisyen raporu:

```text
http://localhost:3000/mtk-rapor
```

## MTK raporu

`/mtk-rapor` sayfası MTK SQL veritabanından okur ve seçilen tarihte test aşamasına çekilen cihazları teknisyen bazında toplar.

Gerekli ortam değişkenleri:

```env
MTK_SQL_SERVER=192.168.80.60
MTK_SQL_DATABASE=HbServis
MTK_SQL_USER=mtksoft
MTK_SQL_PASSWORD=...
MTK_SQL_PORT=1433
```

Lokal kullanımda gerçek bilgileri repoya yazmadan mevcut JSON dosyasını da okutabilirsin:

```env
MTK_SQL_CONFIG_PATH=C:\...\sql-config.json
```

Not: SQL sunucusu yerel ağ IP adresindeyse Vercel bu sunucuya doğrudan erişemez. Bu durumda rapor lokal bilgisayarda çalışır veya SQL sunucusunun güvenli şekilde dışarı açılması/VPN/tunnel gerekir.

## Okunan sayfalar

- `AĞUSTOS`
- `Renk Değişenler`

## Okunan / yazilan alanlar

Okur:

- A Tarih
- B Form No
- C Model
- D IMEI
- E Renk
- I Durum
- K Kaldı Sebebi
- L Not
- M Teknisyen
- N Kalite Kontrol
- O Tamamlandı

Yazar:

- O sütununa `Tamamlandı`
