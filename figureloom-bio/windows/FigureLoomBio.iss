#ifndef AppVersion
#define AppVersion "0.0.0"
#endif
#ifndef AppBuildDir
#define AppBuildDir "."
#endif
#ifndef OutputDir
#define OutputDir "."
#endif
#ifndef IconFile
#define IconFile "figureloom-bio.ico"
#endif

#define AppName "FigureLoom Bio"
#define AppPublisher "FigureLoom"
#define AppUrl "https://figureloom.org/ide/"
#define AppExe "FigureLoom Bio IDE.exe"

[Setup]
AppId={{B534F0C4-70E0-4F6A-86B6-46E9266C6618}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppUrl}
AppSupportURL={#AppUrl}
AppUpdatesURL={#AppUrl}
DefaultDirName={localappdata}\Programs\FigureLoom Bio
DefaultGroupName=FigureLoom Bio
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\{#AppExe}
OutputDir={#OutputDir}
OutputBaseFilename=FigureLoom-Bio-Installer
ChangesEnvironment=yes
CloseApplications=yes
RestartApplications=no

[Files]
Source: "{#AppBuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\FigureLoom Bio IDE"; Filename: "{app}\FigureLoom Bio IDE.exe"; WorkingDir: "{app}"
Name: "{autoprograms}\Test FigureLoom Bio"; Filename: "{app}\Test FigureLoom Bio.exe"; WorkingDir: "{app}"
Name: "{autoprograms}\Install or Update FigureLoom Bio"; Filename: "{app}\Install or Update FigureLoom Bio.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\FigureLoom Bio IDE"; Filename: "{app}\FigureLoom Bio IDE.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Test FigureLoom Bio"; Filename: "{app}\Test FigureLoom Bio.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Install or Update FigureLoom Bio"; Filename: "{app}\Install or Update FigureLoom Bio.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\flbio.exe"; Parameters: "test-files ""{userdesktop}\FigureLoom Bio Test Files"""; Flags: runhidden waituntilterminated
Filename: "{app}\flbio.exe"; Parameters: "quick-test ""{userdesktop}\FigureLoom Bio Test Files"""; Flags: runhidden waituntilterminated

[Code]
function PathContains(const CurrentPath, Entry: string): Boolean;
begin
  Result := Pos(';' + Lowercase(Entry) + ';', ';' + Lowercase(CurrentPath) + ';') > 0;
end;

procedure AddToUserPath;
var
  CurrentPath: string;
  AppPath: string;
begin
  AppPath := ExpandConstant('{app}');
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', CurrentPath) then
    CurrentPath := '';
  if not PathContains(CurrentPath, AppPath) then
  begin
    if (CurrentPath <> '') and (CurrentPath[Length(CurrentPath)] <> ';') then
      CurrentPath := CurrentPath + ';';
    RegWriteExpandStringValue(HKCU, 'Environment', 'Path', CurrentPath + AppPath);
  end;
end;

procedure RemoveFromUserPath;
var
  CurrentPath: string;
  AppPath: string;
begin
  AppPath := ExpandConstant('{app}');
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', CurrentPath) then
    exit;
  if CompareText(CurrentPath, AppPath) = 0 then
    CurrentPath := ''
  else
  begin
    StringChangeEx(CurrentPath, AppPath + ';', '', True);
    StringChangeEx(CurrentPath, ';' + AppPath, '', True);
  end;
  RegWriteExpandStringValue(HKCU, 'Environment', 'Path', CurrentPath);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    AddToUserPath;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    RemoveFromUserPath;
end;
