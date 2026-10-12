$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$sdkRoot = $env:ANDROID_SDK_ROOT
if (-not $sdkRoot) {
  $sdkRoot = $env:ANDROID_HOME
}
if (-not $sdkRoot -and $env:LOCALAPPDATA) {
  $sdkRoot = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}
if (-not $sdkRoot -or -not (Test-Path $sdkRoot -PathType Container)) {
  throw 'Android SDK not found. Set ANDROID_SDK_ROOT or ANDROID_HOME to its location.'
}

$platform = Get-ChildItem (Join-Path $sdkRoot 'platforms') -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^android-(\d+)$' -and (Test-Path (Join-Path $_.FullName 'android.jar')) } |
  Sort-Object { [int]($_.Name -replace '^android-', '') } -Descending |
  Select-Object -First 1
if (-not $platform) {
  throw "No installed Android SDK platform found under '$sdkRoot\platforms'."
}

$d8 = Get-ChildItem (Join-Path $sdkRoot 'build-tools') -Directory -ErrorAction SilentlyContinue |
  Where-Object { Test-Path (Join-Path $_.FullName 'd8.bat') } |
  Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending |
  Select-Object -First 1
if (-not $d8) {
  throw "No Android build-tools installation with d8.bat found under '$sdkRoot\build-tools'."
}

$buildDir = Join-Path $repoRoot 'build\java'
$classesDir = Join-Path $buildDir 'classes'
$dexDir = Join-Path $buildDir 'dex'
$jarPath = Join-Path $buildDir 'labels.jar'
$dexPath = Join-Path $dexDir 'classes.dex'
$assetDir = Join-Path $repoRoot 'assets\android'

New-Item -ItemType Directory -Force -Path $classesDir, $dexDir, $assetDir | Out-Null

& javac --release 11 -cp (Join-Path $platform.FullName 'android.jar') (Join-Path $PSScriptRoot 'Labels.java') -d $classesDir
if ($LASTEXITCODE -ne 0) {
  throw "javac failed with exit code $LASTEXITCODE."
}

& jar cf $jarPath -C $classesDir .
if ($LASTEXITCODE -ne 0) {
  throw "jar failed with exit code $LASTEXITCODE."
}

& (Join-Path $d8.FullName 'd8.bat') --lib (Join-Path $platform.FullName 'android.jar') --min-api 21 --output $dexDir $jarPath
if ($LASTEXITCODE -ne 0) {
  throw "d8 failed with exit code $LASTEXITCODE."
}

Copy-Item $dexPath (Join-Path $assetDir 'labels.dex') -Force
Write-Host "Built assets\android\labels.dex using Android platform $($platform.Name) and build-tools $($d8.Name)."