param(
    [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not $OutputDir) {
    $OutputDir = Join-Path $RepoRoot "dist"
}
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$TempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }
$BuildRoot = Join-Path $TempRoot "figureloom-bio-windows"
$AppBuild = Join-Path $BuildRoot "app"
$WorkRoot = Join-Path $BuildRoot "work"
$SpecRoot = Join-Path $BuildRoot "spec"
$IconPng = Join-Path $RepoRoot "figureloom-bio\linux\assets\figureloom-bio.png"
$IconIco = Join-Path $BuildRoot "figureloom-bio.ico"
$Python = "python"

Remove-Item -Recurse -Force $BuildRoot -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $AppBuild, $WorkRoot, $SpecRoot, $OutputDir | Out-Null

& $Python -m pip install --disable-pip-version-check --upgrade pip
$PackageRoot = Join-Path $RepoRoot "figureloom-bio"
& $Python -m pip install --disable-pip-version-check pyinstaller pillow PySide6 cryptography $PackageRoot
& $Python (Join-Path $RepoRoot "figureloom-bio\scripts\build-platform-icons.py") $IconPng $IconIco

$Version = & $Python -c "import tomllib; print(tomllib.load(open(r'$RepoRoot\figureloom-bio\pyproject.toml','rb'))['project']['version'])"

function Build-FigureLoomExecutable {
    param(
        [string]$Name,
        [string]$Entry,
        [switch]$Console
    )
    $SafeName = $Name -replace '[^A-Za-z0-9]+', '-'
    $Arguments = @(
        "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        $(if ($Console) { "--console" } else { "--windowed" }),
        "--name", $Name,
        "--icon", $IconIco,
        "--paths", (Join-Path $RepoRoot "figureloom-bio"),
        "--collect-data", "figureloom_bio",
        "--add-data", "$IconPng;assets",
        "--distpath", $AppBuild,
        "--workpath", (Join-Path $WorkRoot $SafeName),
        "--specpath", $SpecRoot
    )
    $Arguments += (Join-Path $RepoRoot $Entry)
    & $Python @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "PyInstaller failed while building $Name."
    }
}

function Test-FigureLoomDesktopExecutable {
    param([string]$Name)
    $Executable = Join-Path $AppBuild "$Name.exe"
    if (-not (Test-Path $Executable)) {
        throw "$Name was not built."
    }
    $Process = Start-Process -FilePath $Executable -ArgumentList '--self-test' -Wait -PassThru
    if ($Process.ExitCode -ne 0) {
        throw "$Name failed its real startup self-test with exit code $($Process.ExitCode)."
    }
}

Build-FigureLoomExecutable -Name "flbio" -Entry "figureloom-bio\platform\flbio_entry.py" -Console
Build-FigureLoomExecutable -Name "FigureLoom Bio IDE" -Entry "figureloom-bio\platform\ide_entry.py"
Build-FigureLoomExecutable -Name "Test FigureLoom Bio" -Entry "figureloom-bio\platform\test_entry.py"
Build-FigureLoomExecutable -Name "Install or Update FigureLoom Bio" -Entry "figureloom-bio\platform\manager_entry.py"

$env:QT_QPA_PLATFORM = "offscreen"
Test-FigureLoomDesktopExecutable -Name "FigureLoom Bio IDE"
Test-FigureLoomDesktopExecutable -Name "Test FigureLoom Bio"
Test-FigureLoomDesktopExecutable -Name "Install or Update FigureLoom Bio"

$ForbiddenWebFiles = Get-ChildItem -Path $AppBuild -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $_.Extension -in '.html', '.htm', '.js', '.mjs'
}
if ($ForbiddenWebFiles) {
    throw "The Windows desktop build contains forbidden web-interface files: $($ForbiddenWebFiles.FullName -join ', ')"
}

$Iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $Iscc)) {
    choco install innosetup --no-progress -y
}
if (-not (Test-Path $Iscc)) {
    throw "Inno Setup 6 was not found."
}

& $Iscc `
    "/DAppVersion=$Version" `
    "/DAppBuildDir=$AppBuild" `
    "/DOutputDir=$OutputDir" `
    "/DIconFile=$IconIco" `
    (Join-Path $PSScriptRoot "FigureLoomBio.iss")
if ($LASTEXITCODE -ne 0) {
    throw "Inno Setup failed."
}

$Installer = Join-Path $OutputDir "FigureLoom-Bio-Installer.exe"
if (-not (Test-Path $Installer)) {
    throw "The Windows installer was not created."
}
Write-Output $Installer
