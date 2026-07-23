# FigureLoom Bio Linux desktop installer

FigureLoom Bio is **not preinstalled into the Kasm image**. There is no Kasm image-builder or server-side preinstallation step.

A user installs it only when they choose to, either on a normal Ubuntu or Debian desktop or from inside their own running Kasm desktop session.

## Download FigureLoom Bio

- [Download FigureLoom Bio for Linux and Kasm](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-installer/FigureLoom-Bio-Installer.deb)
- [Download FigureLoom Bio for Windows](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-windows-installer/FigureLoom-Bio-Installer.exe)
- [Download FigureLoom Bio for Mac, Apple Silicon](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Apple-Silicon.pkg)
- [Download FigureLoom Bio for Mac, Intel](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Intel.pkg)

For Linux, open `FigureLoom-Bio-Installer.deb` and approve the normal installation prompt. The package contains the current engine, local IDE, desktop launchers, and test files, so it does not fetch a second installer during installation.

Inside Kasm, download and open the same Linux file inside the running workspace. It installs FigureLoom Bio only into that Linux environment. It does not rebuild, replace, or modify the Kasm Docker image.

The first install adds:

- a desktop and application-menu icon named **Install or Update FigureLoom Bio**;
- a desktop and application-menu icon named **FigureLoom Bio IDE**;
- a desktop icon named **Test FigureLoom Bio**;
- an unzipped desktop folder named **FigureLoom Bio Test Files**;
- `flbio test-files` to recreate the folder;
- `flbio quick-test` to run the automatic test.

After the package is installed, ordinary users can double-click **Install or Update FigureLoom Bio** for later updates or repairs.

## Installer window

The window can:

- install the current version;
- update an existing installation;
- repair missing launchers or desktop files;
- install only missing basic Linux pieces such as Python venv or installer-window support;
- run the real CSV, FASTA, FASTQ, figure, alignment, and tree test;
- open the local IDE;
- open the unzipped desktop test folder.

The language itself still has one built-in capability list. This installer does not add a package or add-on system to `.flbio`.

## What the installer checks

Before reporting success, it checks the required Linux pieces, installs FigureLoom Bio, copies the local IDE, creates all three desktop launchers, creates the test folder, runs `flbio doctor`, and executes `flbio quick-test`.

A desktop browser is required for the local IDE window. Chromium, Google Chrome, Firefox, Firefox ESR, or the normal Linux default-browser handler are supported. Optional external bioinformatics programs are not silently installed.

## Terminal fallback

The downloadable `.deb` package is the normal installation method. The older one-command installer remains only as a fallback for a Linux desktop that cannot open Debian packages:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```
