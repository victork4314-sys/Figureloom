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
& $Python -m pip install --disable-pip-version-check pyinstaller pillow $PackageRoot
& $Python (Join-Path $RepoRoot "figureloom-bio\scripts\build-platform-icons.py") $IconPng $IconIco

$Version = & $Python -c "import tomllib; print(tomllib.load(open(r'$RepoRoot\figureloom-bio\pyproject.toml','rb'))['project']['version'])"

function Build-FigureLoomExecutable {
    param(
        [string]$Name,
        [string]$Entry,
        [switch]$Console,
        [switch]$IncludeIde
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
    if ($IncludeIde) {
        $Arguments += @("--add-data", "$(Join-Path $RepoRoot 'ide');ide")
    }
    $Arguments += (Join-Path $RepoRoot $Entry)
    & $Python @Arguments
}

Build-FigureLoomExecutable -Name "flbio" -Entry "figureloom-bio\platform\flbio_entry.py" -Console
Build-FigureLoomExecutable -Name "FigureLoom Bio IDE" -Entry "figureloom-bio\platform\ide_entry.py" -IncludeIde
Build-FigureLoomExecutable -Name "Test FigureLoom Bio" -Entry "figureloom-bio\platform\test_entry.py"
Build-FigureLoomExecutable -Name "Install or Update FigureLoom Bio" -Entry "figureloom-bio\platform\manager_entry.py"

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

$Installer = Join-Path $OutputDir "FigureLoom-Bio-Installer.exe"
if (-not (Test-Path $Installer)) {
    throw "The Windows installer was not created."
}
Write-Output $Installer
