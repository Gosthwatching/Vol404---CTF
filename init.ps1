[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envExample = Join-Path $root '.env.example'
$envFile = Join-Path $root '.env'

if (-not (Test-Path $envExample)) {
    throw "Fichier introuvable: $envExample"
}

if ((Test-Path $envFile) -and (-not $Force)) {
    Write-Host '.env existe deja. Rien a faire.' -ForegroundColor Yellow
    Write-Host 'Utilisez -Force pour recreer .env depuis .env.example.' -ForegroundColor Yellow
    exit 0
}

Copy-Item -Path $envExample -Destination $envFile -Force

$secret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
$content = Get-Content -Path $envFile -Raw
$content = $content -replace 'SESSION_SECRET=.*', "SESSION_SECRET=$secret"
Set-Content -Path $envFile -Value $content -Encoding ascii

Write-Host '.env cree avec succes a partir de .env.example.' -ForegroundColor Green
Write-Host 'Etapes suivantes:' -ForegroundColor Cyan
Write-Host '1) Ajustez PUBLIC_BASE_URL dans .env (optionnel en local).' -ForegroundColor Cyan
Write-Host '2) Lancez docker compose up -d --build' -ForegroundColor Cyan
