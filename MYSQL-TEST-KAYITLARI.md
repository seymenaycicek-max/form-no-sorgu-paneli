# Test Kayitlari MySQL Kurulumu

Kalite kontrol test kayitlari artik JSON dosyasi yerine MySQL'e yazilir.

## XAMPP

1. XAMPP Control Panel'i ac.
2. MySQL icin `Start` bas.
3. Apache calisiyorsa phpMyAdmin'e gir:

```text
http://localhost:8080/phpmyadmin
```

Apache portun 80 ise:

```text
http://localhost/phpmyadmin
```

## Veritabani

Uygulama acilirken veritabani ve tablolari otomatik kurar.

Elle kurmak istersen phpMyAdmin SQL ekraninda su dosyayi calistir:

```text
sql/test-records.sql
```

Varsayilan MySQL ayarlari:

```env
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USER=root
TEST_DB_PASSWORD=
TEST_DB_NAME=hb_kalite_kontrol
```

## Eski JSON Kayitlarini Aktarma

```bash
npm run migrate:test-records
```

## Calistirma

```bash
npm install
npm start
```

Test sayfasi:

```text
http://localhost:3000/test
```

Kayitlar sayfasi:

```text
http://localhost:3000/test-kayitlari
```
