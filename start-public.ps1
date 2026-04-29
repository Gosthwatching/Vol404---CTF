[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [int]$Port = 3000,
    [switch]$WithSeed,
    [switch]$ResetStack,
    [switch]$ForceKillPort,
    [int]$UrlWaitSeconds = 45
)

$ErrorActionPreference = 'Stop'

function Get-CloudflaredPath {
    $candidates = @(
        'C:\Program Files\cloudflared\cloudflared.exe',
        'C:\Program Files (x86)\cloudflared\cloudflared.exe',
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
    )

    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return $path
        }
    }

    $command = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    return $null
}

function Ensure-Tooling {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker CLI introuvable. Installez Docker Desktop puis relancez le script.'
    }

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'npm introuvable. Installez Node.js puis relancez le script.'
    }
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage
    )

    Invoke-Expression $Command | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

function Remove-ContainerIfExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $idRaw = docker ps -aq --filter "name=^/$Name$" | Out-String
    $id = $idRaw.Trim()
    if (-not $id) {
        return
    }

    Write-Host "==> Suppression du conteneur en conflit: $Name ($id)" -ForegroundColor Yellow
    if ($PSCmdlet.ShouldProcess($Name, 'docker rm -f')) {
        Invoke-CheckedCommand -Command "docker rm -f $id" -ErrorMessage "Impossible de supprimer le conteneur en conflit: $Name"
    }
}

function Remove-ContainersPublishingPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $lines = docker ps --filter "publish=$Port" --format "{{.ID}} {{.Names}}" | Out-String
    $rows = $lines -split "`r?`n" | Where-Object { $_.Trim() -ne '' }

    foreach ($row in $rows) {
        $parts = $row.Trim().Split(' ', 2)
        if ($parts.Count -lt 1) {
            continue
        }

        $id = $parts[0]
        $name = if ($parts.Count -gt 1) { $parts[1] } else { $id }
        Write-Host "==> Suppression du conteneur qui publie le port ${Port}: $name ($id)" -ForegroundColor Yellow
        if ($PSCmdlet.ShouldProcess($name, 'docker rm -f')) {
            Invoke-CheckedCommand -Command "docker rm -f $id" -ErrorMessage "Impossible de supprimer le conteneur qui publie le port ${Port}: $name"
        }
    }
}

function Ensure-PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [switch]$ForceKill
    )

    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $ownerPids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($ownerPid in $ownerPids) {
        $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        $procName = if ($proc) { $proc.ProcessName } else { 'inconnu' }

        if (-not $ForceKill) {
            throw "Le port $Port est deja utilise par PID $ownerPid ($procName). Relancez avec -ForceKillPort ou arretez ce process manuellement."
        }

        Write-Host "==> Arret du process qui bloque le port ${Port}: PID $ownerPid ($procName)" -ForegroundColor Yellow
        if ($PSCmdlet.ShouldProcess("PID $ownerPid", 'Stop-Process -Force')) {
            Stop-Process -Id $ownerPid -Force
        }
    }
}

Write-Host '==> Verification des prerequis...' -ForegroundColor Cyan
Ensure-Tooling

$cloudflaredPath = Get-CloudflaredPath
if (-not $cloudflaredPath) {
    throw "cloudflared introuvable. Installez-le avec: winget install --id Cloudflare.cloudflared -e"
}

Write-Host "==> cloudflared detecte: $cloudflaredPath" -ForegroundColor Cyan

if ($ResetStack) {
    Write-Host '==> Reset de la stack Docker (docker compose down --remove-orphans)...' -ForegroundColor Yellow
    if ($PSCmdlet.ShouldProcess('docker compose stack', 'down --remove-orphans')) {
        docker compose down --remove-orphans | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'Avertissement: docker compose down a retourne une erreur. Nettoyage manuel des conteneurs en cours...' -ForegroundColor Yellow
        }
    }

    # Some old/manual containers can survive compose down when they share static names.
    Remove-ContainerIfExists -Name 'vol404-app'
    Remove-ContainerIfExists -Name 'vol404-mongo'
    Remove-ContainerIfExists -Name 'vol404-mongo-express'
    Remove-ContainersPublishingPort -Port $Port
}

Ensure-PortAvailable -Port $Port -ForceKill:$ForceKillPort

Write-Host '==> Demarrage de l application (docker compose up -d --build)...' -ForegroundColor Cyan
if ($PSCmdlet.ShouldProcess('docker compose stack', 'up -d --build')) {
    Invoke-CheckedCommand -Command 'docker compose up -d --build' -ErrorMessage 'Echec docker compose up. Relancez avec -ResetStack pour nettoyer les anciens conteneurs nommes.'
}

if ($WithSeed) {
    Write-Host '==> Initialisation des donnees (npm run seed)...' -ForegroundColor Cyan
    if ($PSCmdlet.ShouldProcess('application data', 'npm run seed')) {
        Invoke-CheckedCommand -Command 'npm run seed' -ErrorMessage 'Echec npm run seed.'
    }
}

$runtimeDir = Join-Path $PSScriptRoot '.runtime'
if (-not (Test-Path $runtimeDir)) {
    New-Item -Path $runtimeDir -ItemType Directory | Out-Null
}

$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdoutLog = Join-Path $runtimeDir "cloudflared-$runStamp.log"
$stderrLog = Join-Path $runtimeDir "cloudflared-$runStamp.err.log"
$pidFile = Join-Path $runtimeDir 'cloudflared.pid'

# Stop previous process started by this script if still alive
if (Test-Path $pidFile) {
    try {
        $oldPid = [int](Get-Content $pidFile -Raw)
        $oldProc = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
        if ($oldProc) {
            Write-Host "==> Arret de l ancien tunnel (PID $oldPid)..." -ForegroundColor Yellow
            Stop-Process -Id $oldPid -Force
        }
    } catch {
        # Ignore malformed pid file
    }
}

Write-Host '==> Demarrage du tunnel public Cloudflare...' -ForegroundColor Cyan
if (-not $PSCmdlet.ShouldProcess('cloudflared', "tunnel --url http://localhost:$Port")) {
    Write-Host 'Mode WhatIf: aucun tunnel lance.' -ForegroundColor Yellow
    return
}

$proc = Start-Process -FilePath $cloudflaredPath `
    -ArgumentList @('tunnel', '--url', "http://localhost:$Port") `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

$proc.Id | Out-File -FilePath $pidFile -Encoding ascii -Force

$deadline = (Get-Date).AddSeconds($UrlWaitSeconds)
$publicUrl = $null
$regex = 'https://[a-z0-9\-]+\.trycloudflare\.com'

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 700

    $combinedContent = ''
    if (Test-Path $stdoutLog) {
        $combinedContent += (Get-Content $stdoutLog -Raw -ErrorAction SilentlyContinue)
    }
    if (Test-Path $stderrLog) {
        $combinedContent += "`n"
        $combinedContent += (Get-Content $stderrLog -Raw -ErrorAction SilentlyContinue)
    }

    if ($combinedContent -match $regex) {
        $publicUrl = $matches[0]
        break
    }

    # Process died before URL generation
    $alive = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if (-not $alive) {
        break
    }
}

Write-Host ''
if ($publicUrl) {
    Write-Host '==================== URL PUBLIQUE ====================' -ForegroundColor Green
    Write-Host $publicUrl -ForegroundColor Green
    Write-Host '======================================================' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Partagez ce lien aux etudiants.' -ForegroundColor Green
} else {
    Write-Host 'Impossible de recuperer l URL publique automatiquement.' -ForegroundColor Yellow
    Write-Host "Consultez les logs: $stdoutLog et $stderrLog" -ForegroundColor Yellow
}

Write-Host ''
Write-Host "Tunnel PID: $($proc.Id)" -ForegroundColor Cyan
Write-Host "Pour arreter le tunnel: Stop-Process -Id $($proc.Id)" -ForegroundColor Cyan
Write-Host 'Pour arreter les conteneurs: docker compose down' -ForegroundColor Cyan

# Avoid inheriting a stale non-zero native exit code (e.g. from docker down warnings).
$global:LASTEXITCODE = 0
