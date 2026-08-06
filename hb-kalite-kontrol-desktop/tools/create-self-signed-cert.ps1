param(
  [string]$Subject = "CN=HB Kalite Kontrol",
  [string]$OutputDirectory = ".\certs"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDirectory)) {
  New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}

$password = Read-Host "PFX şifresi girin" -AsSecureString

$certificate = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject $Subject `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyAlgorithm RSA `
  -KeyLength 3072 `
  -HashAlgorithm SHA256 `
  -KeyUsage DigitalSignature `
  -NotAfter (Get-Date).AddYears(5)

$pfxPath = Join-Path $OutputDirectory "hb-kalite-kontrol-codesign.pfx"
$cerPath = Join-Path $OutputDirectory "hb-kalite-kontrol-codesign.cer"
$base64Path = Join-Path $OutputDirectory "hb-kalite-kontrol-codesign-base64.txt"

Export-PfxCertificate `
  -Cert $certificate `
  -FilePath $pfxPath `
  -Password $password | Out-Null

Export-Certificate `
  -Cert $certificate `
  -FilePath $cerPath | Out-Null

[Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Resolve-Path $pfxPath))) |
  Set-Content -Path $base64Path -Encoding ASCII

Write-Host ""
Write-Host "Sertifika oluşturuldu:"
Write-Host "PFX: $pfxPath"
Write-Host "CER: $cerPath"
Write-Host "GitHub secret için Base64: $base64Path"
Write-Host ""
Write-Host "GitHub Secrets:"
Write-Host "WINDOWS_CERTIFICATE_PFX_BASE64 = $base64Path içeriği"
Write-Host "WINDOWS_CERTIFICATE_PASSWORD = biraz önce girdiğiniz PFX şifresi"
