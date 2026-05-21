param(
  [string]$NodeRoot = $env:PORTABLE_NODE_ROOT,
  [ValidateSet("check", "install", "login", "build", "database-init", "database-list", "deploy", "rules", "hosting", "functions", "artifacts-policy", "owner-claim-dry-run", "owner-claim", "owner-repair-dry-run", "owner-repair", "backfill-dry-run", "backfill")]
  [string]$Task = "check",
  [string]$ProjectId = "trip-planner-36455",
  [string]$FunctionsLocation = "asia-east1"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($NodeRoot)) {
  throw "Set -NodeRoot or PORTABLE_NODE_ROOT to the standalone Node folder."
}

$nodeExe = Join-Path $NodeRoot "node.exe"
$npmCmd = Join-Path $NodeRoot "npm.cmd"
$firebaseCmd = Join-Path $NodeRoot "firebase.cmd"

if (!(Test-Path $nodeExe)) {
  throw "node.exe was not found at $nodeExe"
}

if (!(Test-Path $npmCmd)) {
  throw "npm.cmd was not found at $npmCmd"
}

$env:Path = "$NodeRoot;$env:Path"
$env:NO_UPDATE_NOTIFIER = "1"

function Invoke-RootNpm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  & $npmCmd @Args
  if ($LASTEXITCODE -ne 0) {
    throw "npm command failed with exit code $LASTEXITCODE"
  }
}

function Invoke-FunctionsNpm {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  Push-Location "functions"
  try {
    & $npmCmd @Args
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($exitCode -ne 0) {
    throw "functions npm command failed with exit code $exitCode"
  }
}

function Invoke-Firebase {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  if (!(Test-Path $firebaseCmd)) {
    throw "firebase.cmd was not found at $firebaseCmd. Run: .\scripts\firebase-portable-node.ps1 -Task install"
  }
  & $firebaseCmd @Args
  if ($LASTEXITCODE -ne 0) {
    throw "firebase command failed with exit code $LASTEXITCODE"
  }
}

Write-Host "Using Node from $NodeRoot"
& $nodeExe -v
& $npmCmd -v

switch ($Task) {
  "check" {
    if (Test-Path $firebaseCmd) {
      & $firebaseCmd --version
      $global:LASTEXITCODE = 0
    } else {
      Write-Host "Firebase CLI is not installed in this Node folder yet."
    }
  }
  "install" {
    Invoke-RootNpm install
    Invoke-RootNpm install -g firebase-tools
    Invoke-FunctionsNpm install
    Invoke-FunctionsNpm run lint
  }
  "login" {
    Invoke-Firebase login
    Invoke-Firebase projects:list
    Invoke-Firebase use $ProjectId
  }
  "build" {
    Invoke-RootNpm run build
  }
  "database-init" {
    Invoke-Firebase init database --project $ProjectId
  }
  "database-list" {
    Invoke-Firebase database:instances:list --project $ProjectId
  }
  "deploy" {
    Invoke-RootNpm run build
    Invoke-Firebase deploy --only "firestore:rules,database,functions,hosting"
  }
  "rules" {
    Invoke-Firebase deploy --only "firestore:rules,database"
  }
  "hosting" {
    Invoke-RootNpm run build
    Invoke-Firebase deploy --only "hosting"
  }
  "functions" {
    Invoke-Firebase deploy --only "functions"
  }
  "artifacts-policy" {
    Invoke-Firebase functions:artifacts:setpolicy --location $FunctionsLocation --days 7 --force --project $ProjectId
  }
  "owner-claim-dry-run" {
    Invoke-RootNpm run owner:claim -- --dry-run
  }
  "owner-claim" {
    Invoke-RootNpm run owner:claim
  }
  "owner-repair-dry-run" {
    Invoke-RootNpm run owner:repair -- --dry-run
  }
  "owner-repair" {
    Invoke-RootNpm run owner:repair
  }
  "backfill-dry-run" {
    Invoke-RootNpm run presence:backfill -- --dry-run
  }
  "backfill" {
    Invoke-RootNpm run presence:backfill
  }
}
