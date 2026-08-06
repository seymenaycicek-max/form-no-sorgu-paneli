# HB Kalite Kontrol

Bu proje `https://kkhb.vercel.app/test` adresini Chrome veya Edge açmadan bağımsız bir Windows uygulama penceresinde çalıştıran Tauri 2 masaüstü uygulamasıdır.

## 1. Gerekli programlar

- Node.js 22 veya güncel LTS
- Rust
- Microsoft C++ Build Tools
- Windows 10 veya Windows 11
- Microsoft Edge WebView2 Runtime

## 2. Node.js kurulumu

Node.js indirme adresi:

https://nodejs.org/

Kurulumdan sonra PowerShell içinde kontrol edin:

```powershell
node --version
npm --version
```

Bu bilgisayarda portable Node kullanılıyorsa komut örneği:

```powershell
C:\Users\saycicek\Documents\Codex\tools\node22\node.exe C:\Users\saycicek\Documents\Codex\tools\node22\node_modules\npm\bin\npm-cli.js install
```

## 3. Rust kurulumu

Rust için resmi kurulum:

https://www.rust-lang.org/tools/install

Kurulumdan sonra PowerShell'i kapatıp açın ve kontrol edin:

```powershell
rustc --version
cargo --version
```

## 4. Microsoft C++ Build Tools kurulumu

Tauri Windows build için Microsoft C++ Build Tools gerekir.

Kurulum:

https://visualstudio.microsoft.com/visual-cpp-build-tools/

Kurulum ekranında şu bileşeni seçin:

```text
Desktop development with C++
```

## 5. Projenin çalıştırılması

Proje klasörüne girin:

```powershell
cd C:\Users\saycicek\Documents\Codex\2026-08-04\anlad-m-sistem-tam-olarak-yle\hb-kalite-kontrol-desktop
```

Paketleri kurun:

```powershell
npm install
```

## 6. Development modu

```powershell
npm run tauri dev
```

Bu komut Vite geliştirme sunucusunu açar ve Tauri penceresini başlatır.

## 7. .exe oluşturma

```powershell
npm run tauri build
```

Build sonunda taşınabilir uygulama exe'si ve NSIS kurulum dosyası oluşur.

Yerel bilgisayarda bu komut için Microsoft C++ Build Tools gerekir. Bu araç genelde yönetici izni ister.

Yönetici izni kullanmadan exe üretmek için GitHub Actions workflow dosyası hazırdır:

```text
.github\workflows\build-windows.yml
```

Projeyi GitHub'a pushladıktan sonra:

1. GitHub reposuna girin.
2. `Actions` sekmesini açın.
3. `Windows EXE Build` workflow'unu seçin.
4. `Run workflow` butonuna basın.
5. Build bitince `Artifacts` bölümünden exe dosyalarını indirin.

## 8. Kurulum dosyasının oluşacağı klasör

NSIS kurulum dosyası:

```powershell
src-tauri\target\release\bundle\nsis\
```

Dosya adı şuna benzer:

```text
HB Kalite Kontrol_1.0.0_x64-setup.exe
```

Portable exe:

```powershell
src-tauri\target\release\hb-kalite-kontrol.exe
```

## 9. Uygulama neden yönetici izni istemez?

Bu proje yönetici yetkisi gerektirmeyecek şekilde ayarlanmıştır:

- Tauri uygulaması normal kullanıcı yetkisiyle çalışır.
- Windows servisi oluşturmaz.
- `Program Files` altına yazmaz.
- Yönetici yetkisi isteyen kayıt defteri alanlarını kullanmaz.
- Tauri shell, filesystem, kamera, mikrofon veya komut çalıştırma izinleri verilmemiştir.
- Capability dosyasında yalnızca hata ekranındaki `Uygulamayı Kapat` butonu için `core:window:allow-close` izni vardır.
- NSIS ayarı `installMode: currentUser` şeklindedir.
- WebView2 installer modu `skip` olarak ayarlanmıştır; kurulum sırasında WebView2 yüklemeye çalışıp UAC açmaz.
- Windows manifest içinde `requestedExecutionLevel level="asInvoker"` açıkça tanımlıdır.

Kullanıcı verisi gerekirse Windows tarafından uygulama için ayrılan kullanıcı klasörleri kullanılır:

```text
%LOCALAPPDATA%
%APPDATA%
```

## 10. Başka bilgisayarlara dağıtım

Dağıtım için iki seçenek vardır:

1. Kurulum dosyası:

```text
src-tauri\target\release\bundle\nsis\HB Kalite Kontrol_1.0.0_x64-setup.exe
```

2. Portable exe:

```text
src-tauri\target\release\hb-kalite-kontrol.exe
```

Hedef bilgisayarda Microsoft Edge WebView2 Runtime kurulu olmalıdır. Windows 10 ve Windows 11 sistemlerin çoğunda WebView2 zaten kurulu gelir. WebView2 yoksa uygulama penceresi açılamayabilir. Bu durumda WebView2 Evergreen Runtime kullanıcı bazlı olarak kurulmalıdır.

WebView2 indirme adresi:

https://developer.microsoft.com/microsoft-edge/webview2/

## 11. Self-signed imzalama

Bu proje GitHub Actions içinde exe imzalamayı destekler. Resmi code signing sertifikası yoksa self-signed sertifika kullanılabilir.

Self-signed imza resmi sertifika kadar güçlü değildir. Windows SmartScreen uyarısını tamamen bitirmeyebilir. Firma içi kullanım için hedef bilgisayarlara sertifika bir kere güvenilir olarak eklenmelidir.

Sertifika üretme:

```powershell
cd C:\Users\saycicek\Documents\Codex\2026-08-04\anlad-m-sistem-tam-olarak-yle\web-panel\hb-kalite-kontrol-desktop
powershell -ExecutionPolicy Bypass -File .\tools\create-self-signed-cert.ps1
```

Bu komut `certs` klasöründe şu dosyaları oluşturur:

```text
hb-kalite-kontrol-codesign.pfx
hb-kalite-kontrol-codesign.cer
hb-kalite-kontrol-codesign-base64.txt
```

GitHub repo ayarlarına girin:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Şu iki secret eklenmelidir:

```text
WINDOWS_CERTIFICATE_PFX_BASE64
WINDOWS_CERTIFICATE_PASSWORD
```

`WINDOWS_CERTIFICATE_PFX_BASE64` değeri için `hb-kalite-kontrol-codesign-base64.txt` dosyasının içeriğini yapıştırın.

`WINDOWS_CERTIFICATE_PASSWORD` değeri için sertifikayı üretirken girdiğiniz PFX şifresini yazın.

Hedef bilgisayarda sertifikayı mevcut kullanıcı için güvenilir hale getirme:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\trust-cert-current-user.ps1 -CertificatePath .\certs\hb-kalite-kontrol-codesign.cer
```

Bu işlem yönetici izni istemeden mevcut kullanıcı sertifika deposuna ekleme yapar.

GitHub Actions build sonrası şu dosyaları imzalar:

```text
src-tauri\target\release\*.exe
src-tauri\target\release\bundle\nsis\*.exe
```

## Uygulama davranışı

- Uygulama adı: `HB Kalite Kontrol`
- Açılan adres: `https://kkhb.vercel.app/test`
- Başlangıç boyutu: `1280x800`
- Minimum boyut: `1000x650`
- Tek uygulama örneği çalışır.
- İkinci kez açılırsa mevcut pencere öne gelir.
- İnternet yoksa Türkçe hata ekranı gösterilir.
- `1`, `2`, `Space`, `Backspace`, `Enter`, `Tab` tuşları web sayfasına engellenmeden ulaşır.
- Uygulama kabuğu focus'tayken `Backspace` önceki sayfaya gitmez.

## Güvenlik

Uygulama yalnızca gerekli web adresine izin verir:

```text
https://kkhb.vercel.app
```

Tauri CSP ayarı bu domain dışında iframe ve bağlantı izni vermez. Tauri capability dosyasında yalnızca pencere kapatma izni tanımlıdır.
