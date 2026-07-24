$ErrorActionPreference = 'Stop'

$tag = 'figureloom-bio-windows-installer'
$target = 'e23b6c162ca6b09fb2a3fbedc1b0f4d95635bd05'
$assetName = 'FigureLoom-Bio-Installer.exe'
$title = 'FigureLoom Bio Windows Installer'
$notes = 'Download the EXE and follow the normal installer. This is the native desktop build that passed installation, IDE startup and paint, syntax coloring, Test, Updater, CLI doctor, Desktop test files, language quick tests, and the real volcano-plot test. It contains no bundled HTML or browser interface.'

function Assert-CommandSucceeded([string]$message) {
    if ($LASTEXITCODE -ne 0) {
        throw $message
    }
}

$existingTagLine = git ls-remote --tags origin "refs/tags/$tag"
Assert-CommandSucceeded 'Could not read the current stable Windows tag.'
$existingSha = if ($existingTagLine) { ($existingTagLine -split '\s+')[0] } else { '' }
$existingAssets = @()
if ($existingSha -eq $target) {
    $existingAssets = @(gh release view $tag --json assets --jq '.assets[].name' 2>$null)
    if ($LASTEXITCODE -eq 0 -and $existingAssets -contains $assetName) {
        Write-Host 'The fixed Windows installer is already published and verified.'
        exit 0
    }
}

$root = Join-Path $env:RUNNER_TEMP 'figureloom-proven-windows-publisher'
$artifactZip = Join-Path $root 'windows-artifact.zip'
$artifactFolder = Join-Path $root 'windows'
$stableAsset = Join-Path $root $assetName
Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $artifactFolder | Out-Null

$headers = @{
    Authorization = "Bearer $env:GH_TOKEN"
    Accept = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2026-03-10'
}
$url = "https://api.github.com/repos/$env:GITHUB_REPOSITORY/actions/artifacts/8582215395/zip"
Invoke-WebRequest -Uri $url -Headers $headers -OutFile $artifactZip
Expand-Archive -Path $artifactZip -DestinationPath $artifactFolder -Force
$installer = Get-ChildItem -Path $artifactFolder -Recurse -File -Filter $assetName | Select-Object -First 1
if (-not $installer) {
    throw 'The proven Windows installer was not present in the artifact.'
}
$bytes = [System.IO.File]::ReadAllBytes($installer.FullName)
if ($bytes.Length -lt 2 -or $bytes[0] -ne 0x4D -or $bytes[1] -ne 0x5A) {
    throw 'The downloaded file is not a valid Windows executable.'
}
Copy-Item -Path $installer.FullName -Destination $stableAsset -Force
Get-FileHash -Algorithm SHA256 $stableAsset | Format-List

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git tag --force $tag $target
Assert-CommandSucceeded 'Could not create the corrected stable tag locally.'
git push origin "refs/tags/$tag" --force
Assert-CommandSucceeded 'Could not move the corrected stable tag on GitHub.'

gh release view $tag *> $null
$releaseExists = $LASTEXITCODE -eq 0
if ($releaseExists) {
    gh release upload $tag $stableAsset --clobber
    Assert-CommandSucceeded 'Could not replace the stable Windows installer asset.'
    gh release edit $tag --latest --title $title --notes $notes
    Assert-CommandSucceeded 'Could not update the stable Windows release details.'
} else {
    gh release create $tag $stableAsset --target $target --latest --title $title --notes $notes
    Assert-CommandSucceeded 'Could not create the stable Windows release.'
}

$remoteLine = git ls-remote --tags origin "refs/tags/$tag"
Assert-CommandSucceeded 'Could not verify the corrected stable tag.'
$remoteSha = ($remoteLine -split '\s+')[0]
if ($remoteSha -ne $target) {
    throw "Stable tag points to $remoteSha instead of $target."
}
$assets = @(gh release view $tag --json assets --jq '.assets[].name')
if ($LASTEXITCODE -ne 0 -or $assets -notcontains $assetName) {
    throw 'The corrected Windows installer is missing from the stable release.'
}
Write-Host 'The fixed Windows installer release and tag are published and verified.'
