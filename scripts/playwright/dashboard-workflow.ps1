param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$Session = "totalchiller-workflow",
  [string]$AuthStatePath = "",
  [string]$LoginIdentifier = "",
  [string]$LoginPassword = "",
  [switch]$Headed
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
Set-Location $repoRoot

$nodeArgs = @(
  "scripts/playwright/dashboard-workflow.mjs",
  "--base-url", $BaseUrl,
  "--session", $Session
)

if ($AuthStatePath) {
  $nodeArgs += @("--auth-state", $AuthStatePath)
}
if ($LoginIdentifier) {
  $nodeArgs += @("--login-identifier", $LoginIdentifier)
}
if ($LoginPassword) {
  $nodeArgs += @("--login-password", $LoginPassword)
}
if ($Headed) {
  $nodeArgs += "--headed"
}

& node @nodeArgs
if ($LASTEXITCODE -ne 0) {
  throw "dashboard-workflow.mjs failed with exit code $LASTEXITCODE"
}
