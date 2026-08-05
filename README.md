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
