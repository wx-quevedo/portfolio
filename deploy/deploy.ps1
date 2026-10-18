<#
.SYNOPSIS
  Publish washingtonquevedo.com (static Astro build) to the VPS in one command.

.DESCRIPTION
  1. Reads DEPLOY_HOST (user@host) and the optional CERTBOT_EMAIL from deploy/.deploy.local
     (ignored by git; the host and user are never printed or committed).
  2. Builds locally: npm ci, npm run build, precompresses dist (.gz/.br) and computes the CSP
     hashes of the inline scripts.
  3. Packages dist, the nginx site, the headers snippet and remote-deploy.sh, uploads them with scp.
  4. Runs deploy/remote-deploy.sh on the server in one ssh -t session (sudo password once):
     new release folder, current symlink, nginx site and snippet, certbot for both names.
  5. Smoke test over the internet: HTTPS 200 on / and /es/, www redirect, cache and compression
     headers of the model and the WebAssembly runtime.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1

.EXAMPLE
  # Build and package only; nothing is sent.
  powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -DryRun
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$ForceNginx,
    [switch]$AllowDirty,
    [switch]$SkipSmokeTest,
    [string]$ConfigPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Windows PowerShell 5.1 leaves $PSScriptRoot empty inside param() defaults.
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $ConfigPath) { $ConfigPath = Join-Path $ScriptDir ".deploy.local" }
$Root = Split-Path $ScriptDir -Parent
$Domain = "washingtonquevedo.com"
$RemoteStage = "washingtonquevedo-deploy"   # relative to the remote user's home
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Read-KeyValueFile([string]$Path) {
    $values = [ordered]@{}
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') { $values[$Matches[1]] = $Matches[2] }
    }
    return $values
}

# Windows PowerShell 5.1 turns stderr lines of native programs into errors under Stop:
# judge native commands by their exit code instead.
function Invoke-Native([string]$What, [scriptblock]$Command) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { & $Command } finally { $ErrorActionPreference = $previous }
    if ($LASTEXITCODE -ne 0) { throw "$What failed (exit code $LASTEXITCODE)." }
}

function Get-NativeOutput([scriptblock]$Command) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { $output = & $Command 2>$null } finally { $ErrorActionPreference = $previous }
    return [pscustomobject]@{ Output = $output; ExitCode = $LASTEXITCODE }
}

function Write-LF([string]$Path, [string[]]$Lines) {
    [System.IO.File]::WriteAllText($Path, (($Lines -join "`n") + "`n"), $Utf8NoBom)
}

# ------------------------------------------------------------------ settings
if (-not (Test-Path $ConfigPath)) {
    throw "Missing deploy/.deploy.local. Copy deploy/.deploy.local.example and set DEPLOY_HOST=user@host."
}
$config = Read-KeyValueFile $ConfigPath
if (-not $config.Contains("DEPLOY_HOST") -or $config["DEPLOY_HOST"] -notmatch '^[^@\s]+@[^@\s]+$') {
    throw "DEPLOY_HOST in deploy/.deploy.local must look like user@host."
}
$DeployHost = $config["DEPLOY_HOST"]
$CertbotEmail = if ($config.Contains("CERTBOT_EMAIL") -and $config["CERTBOT_EMAIL"]) { $config["CERTBOT_EMAIL"] } else { "-" }
if ($CertbotEmail -ne "-" -and $CertbotEmail -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') { throw "CERTBOT_EMAIL is not an email address." }

Push-Location $Root
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("wq-deploy-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
    # ------------------------------------------------------------ release
    $dirty = (Get-NativeOutput { git status --porcelain --untracked-files=no }).Output
    if ($dirty -and -not $AllowDirty) {
        throw "There are uncommitted changes. Commit first (the release is named after HEAD), or use -AllowDirty."
    }
    $head = (git rev-parse --short=8 HEAD).Trim()
    $release = "{0}-{1}" -f (Get-Date -Format "yyyyMMdd-HHmmss"), $head
    Write-Host "Release $release"

    # -------------------------------------------------------------- build
    Write-Host "`n==> npm ci"
    Invoke-Native "npm ci" { npm ci --no-audit --no-fund }
    Write-Host "`n==> npm run build"
    Invoke-Native "npm run build" { npm run build }
    Write-Host "`n==> Precompressing dist (.gz and .br)"
    Invoke-Native "precompress" { node scripts/precompress.mjs dist }
    $hashes = (Get-NativeOutput { node scripts/csp-hashes.mjs dist }).Output -join " "
    if (-not $hashes -or $hashes -notmatch "^'sha256-") { throw "Could not compute the CSP script hashes." }

    # ------------------------------------------------------------ package
    Write-Host "`n==> Packaging"
    Invoke-Native "tar" { tar -czf (Join-Path $tmp "site.tar.gz") -C dist . }
    $snippet = [System.IO.File]::ReadAllText((Join-Path $ScriptDir "nginx\washingtonquevedo.com-snippet.conf")).Replace("__SCRIPT_HASHES__", $hashes)
    Write-LF (Join-Path $tmp "nginx-snippet.conf") ($snippet -split "\r?\n" | Where-Object { $_ -ne $null })
    foreach ($pair in @(@("nginx\washingtonquevedo.com.conf", "nginx-site.conf"), @("nginx\washingtonquevedo.com-brotli.conf", "nginx-brotli.conf"), @("remote-deploy.sh", "remote-deploy.sh"))) {
        # LF line endings: these files run or are parsed on Linux.
        Write-LF (Join-Path $tmp $pair[1]) ([System.IO.File]::ReadAllLines((Join-Path $ScriptDir $pair[0])))
    }
    $wasm = Get-ChildItem dist\_astro -Filter "ort-wasm-simd-threaded-*.wasm" | Where-Object { $_.Name -notmatch "asyncify" } | Select-Object -First 1
    $distFiles = Get-ChildItem dist -Recurse -File
    $distSize = ($distFiles | Measure-Object Length -Sum).Sum

    if ($DryRun) {
        Write-Host "`nDry run: nothing was sent. Package for ${RemoteStage}/ on <DEPLOY_HOST>:"
        Get-ChildItem $tmp | ForEach-Object { Write-Host ("  {0,-20} {1,14:N0} bytes" -f $_.Name, $_.Length) }
        Write-Host ("  dist: {0:N0} files, {1:N1} MB (including .gz/.br)" -f $distFiles.Count, ($distSize / 1MB))
        Write-Host "  CSP script hashes: $(($hashes -split ' ').Count)"
        $csp = ($snippet -split "\r?\n" | Where-Object { $_ -match 'Content-Security-Policy' })
        Write-Host "  $($csp.Trim())"
        Write-Host "  certbot email: $(if ($CertbotEmail -eq '-') { 'none (uses the existing certbot account)' } else { 'from deploy/.deploy.local' })"
        Write-Host "  remote command: bash $RemoteStage/remote-deploy.sh $RemoteStage $release <email> $(if ($ForceNginx) { 1 } else { 0 })"
        Write-Host "  smoke test after deploy: https://$Domain/, /es/, www redirect, /models/tuna4_n_v1/*, /_astro/$($wasm.Name)"
        return
    }

    # ------------------------------------------------------------- upload
    Write-Host "`n==> Uploading the package"
    Invoke-Native "ssh (prepare)" { ssh $DeployHost "umask 077 && rm -rf $RemoteStage && mkdir -p $RemoteStage" }
    $files = "site.tar.gz", "nginx-site.conf", "nginx-snippet.conf", "nginx-brotli.conf", "remote-deploy.sh" | ForEach-Object { Join-Path $tmp $_ }
    Invoke-Native "scp" { scp -q @files "${DeployHost}:$RemoteStage/" }

    # ------------------------------------------------------------- deploy
    Write-Host "`n==> Server-side deploy (sudo password asked once)"
    $force = if ($ForceNginx) { "1" } else { "0" }
    Invoke-Native "remote deploy" { ssh -t $DeployHost "bash $RemoteStage/remote-deploy.sh $RemoteStage $release $CertbotEmail $force" }
}
finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    Pop-Location
}

if ($DryRun -or $SkipSmokeTest) { exit 0 }

# ------------------------------------------------------------------ smoke test
Write-Host "`n==> Smoke test over the internet"
function Get-Head([string]$Url) {
    $raw = Get-NativeOutput { curl.exe -sS -I --max-time 30 -H "Accept-Encoding: br, gzip" $Url }
    $headers = @{}
    $status = 0
    foreach ($line in $raw.Output) {
        if ($line -match '^HTTP/\S+\s+(\d{3})') { $status = [int]$Matches[1]; $headers = @{} }
        elseif ($line -match '^([^:]+):\s*(.*)$') { $headers[$Matches[1].ToLower()] = $Matches[2].Trim() }
    }
    return [pscustomobject]@{ Status = $status; Headers = $headers }
}
$failures = 0
function Check([string]$Name, [bool]$Ok, [string]$Detail) {
    $script:failures += [int](-not $Ok)
    Write-Host ("  [{0}] {1,-44} {2}" -f $(if ($Ok) { "ok" } else { "FAIL" }), $Name, $Detail)
}
$r = Get-Head "https://$Domain/"
Check "https://$Domain/" ($r.Status -eq 200) "HTTP $($r.Status)"
Check "  Content-Security-Policy" ([bool]$r.Headers["content-security-policy"]) ""
Check "  Cache-Control (html)" ($r.Headers["cache-control"] -match "max-age=0") $r.Headers["cache-control"]
$r = Get-Head "https://$Domain/es/"
Check "https://$Domain/es/" ($r.Status -eq 200) "HTTP $($r.Status)"
$r = Get-Head "https://www.$Domain/es/"
Check "https://www.$Domain/es/ -> apex" ($r.Status -eq 301 -and $r.Headers["location"] -eq "https://$Domain/es/") "HTTP $($r.Status) $($r.Headers['location'])"
$r = Get-Head "http://$Domain/"
Check "http://$Domain/ -> https" ($r.Status -eq 301 -and $r.Headers["location"] -like "https://*") "HTTP $($r.Status) $($r.Headers['location'])"
$r = Get-Head "https://$Domain/models/tuna4_n_v1/labels.json"
Check "/models/tuna4_n_v1/labels.json" ($r.Status -eq 200) "HTTP $($r.Status)"
$r = Get-Head "https://$Domain/models/tuna4_n_v1/tuna4_n_v1_o2m.onnx"
Check "/models/tuna4_n_v1/tuna4_n_v1_o2m.onnx" ($r.Status -eq 200 -and $r.Headers["content-type"] -eq "application/octet-stream") "HTTP $($r.Status) $($r.Headers['content-type'])"
Check "  Content-Encoding" ($r.Headers["content-encoding"] -match "^(br|gzip)$") $r.Headers["content-encoding"]
Check "  Cache-Control immutable" ($r.Headers["cache-control"] -match "immutable") $r.Headers["cache-control"]
$r = Get-Head "https://$Domain/_astro/$($wasm.Name)"
Check "/_astro/*.wasm" ($r.Status -eq 200 -and $r.Headers["content-type"] -eq "application/wasm") "HTTP $($r.Status) $($r.Headers['content-type'])"
Check "  Content-Encoding" ($r.Headers["content-encoding"] -match "^(br|gzip)$") $r.Headers["content-encoding"]
Check "  Cache-Control immutable" ($r.Headers["cache-control"] -match "immutable") $r.Headers["cache-control"]
if ($failures -gt 0) { Write-Warning "$failures smoke test check(s) failed."; exit 1 }
Write-Host "`nhttps://$Domain/ is live (release $release)."
