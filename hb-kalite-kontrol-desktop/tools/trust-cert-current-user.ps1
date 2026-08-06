param(
  [Parameter(Mandatory = $true)]
  [string]$CertificatePath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $CertificatePath)) {
  throw "Sertifika dosyası bulunamadı: $CertificatePath"
}

Import-Certificate `
  -FilePath $CertificatePath `
  -CertStoreLocation "Cert:\CurrentUser\TrustedPublisher" | Out-Null

Import-Certificate `
  -FilePath $CertificatePath `
  -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null

Write-Host "Sertifika mevcut kullanıcı için güvenilir hale getirildi."
