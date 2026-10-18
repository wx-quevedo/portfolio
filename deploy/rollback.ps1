<#
.SYNOPSIS
  Put the previous release of washingtonquevedo.com back online.

.DESCRIPTION
  Runs on the server in one ssh -t session (sudo password once): points
  /var/www/washingtonquevedo.com/current at the release just before the current one (or at the
  one given with -Release) with an atomic symlink switch. nginx, the certificate and the other
  releases are not touched, so a later deploy works as usual.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\rollback.ps1
  powershell -ExecutionPolicy Bypass -File deploy\rollback.ps1 -List
  powershell -ExecutionPolicy Bypass -File deploy\rollback.ps1 -Release 20261018-140000-fcd36db0
#>
[CmdletBinding()]
param(
    [switch]$List,
    [string]$Release,
    [string]$ConfigPath
)

$ErrorActionPreference = "Stop"
# Computed in the body: Windows PowerShell 5.1 leaves $PSScriptRoot empty in param() defaults.
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$LocalConfig = if ($ConfigPath) { $ConfigPath } else { Join-Path $ScriptDir ".deploy.local" }
if (-not (Test-Path $LocalConfig)) { throw "Missing $LocalConfig with DEPLOY_HOST=user@host." }

$DeployHost = $null
foreach ($line in [System.IO.File]::ReadAllLines($LocalConfig)) {
    if ($line -match '^\s*DEPLOY_HOST\s*=\s*(\S+)\s*$') { $DeployHost = $Matches[1] }
}
if (-not $DeployHost -or $DeployHost -notmatch '^[^@\s]+@[^@\s]+$') {
    throw "DEPLOY_HOST in deploy/.deploy.local must look like user@host."
}
if ($Release -and $Release -notmatch '^\d{8}-\d{6}-[0-9a-f]{7,}$') { throw "-Release must look like 20261018-140000-fcd36db0." }

$base = "/var/www/washingtonquevedo.com"
$listCmd = "ls -1 $base/releases | sort -r | while read r; do if [ `"$base/releases/`$r`" = `"`$(readlink -f $base/current)`" ]; then echo `"  `$r  <- current`"; else echo `"  `$r`"; fi; done"
if ($List) {
    ssh $DeployHost $listCmd
    exit $LASTEXITCODE
}

$pick = if ($Release) {
    "target=$base/releases/$Release; [ -d `"`$target`" ] || { echo 'no such release' >&2; exit 1; }"
} else {
    "cur=`$(readlink -f $base/current); target=`$(ls -1d $base/releases/*/ | sed 's#/`$##' | sort -r | awk -v cur=`"`$cur`" 'found {print; exit} `$0 == cur {found=1}'); [ -n `"`$target`" ] || { echo 'no older release to go back to' >&2; exit 1; }"
}
$remote = @(
    "set -e",
    "sudo -v",
    $pick,
    "sudo ln -sfn `"`$target`" $base/current.tmp",
    "sudo mv -Tf $base/current.tmp $base/current",
    "echo `"current -> `$(basename `$(readlink -f $base/current))`"",
    $listCmd
) -join "; "

ssh -t $DeployHost $remote
if ($LASTEXITCODE -ne 0) { throw "Rollback failed (exit code $LASTEXITCODE)." }
Write-Host "Rolled back. Check https://washingtonquevedo.com/"
