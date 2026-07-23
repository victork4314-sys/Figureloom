# Install FigureLoom Bio

FigureLoom Bio installs like a normal desktop program. There is no terminal command in the normal setup.

## Download for your computer

- [Download FigureLoom Bio for Linux](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-installer/FigureLoom-Bio-Installer.deb)
- [Download FigureLoom Bio for Windows](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-windows-installer/FigureLoom-Bio-Installer.exe)
- [Download FigureLoom Bio for Mac, Apple Silicon](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Apple-Silicon.pkg)
- [Download FigureLoom Bio for Mac, Intel](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Intel.pkg)

Apple Silicon means an M1, M2, M3, M4, M5, or newer Apple-chip Mac. Use the Intel package only on an Intel Mac.

## Install it

### Linux

1. Press **Download FigureLoom Bio for Linux** above.
2. Open `FigureLoom-Bio-Installer.deb` from the Downloads folder.
3. Press **Install** and approve the normal Linux administrator prompt.

Inside Kasm, open this page in the running workspace, download the same file, and open it there. FigureLoom Bio is installed only because that user chose to install it. Nothing is preinstalled into or baked into the Kasm image.

### Windows

1. Press **Download FigureLoom Bio for Windows**.
2. Open `FigureLoom-Bio-Installer.exe`.
3. Follow the normal Windows installer.

The Windows installer does not require a separate Python installation. It installs only for the current Windows user, adds the desktop and Start Menu shortcuts, and makes `flbio` available in new terminal windows.

### macOS

1. Choose the Apple Silicon or Intel package above.
2. Open the downloaded `.pkg` file.
3. Follow the normal macOS installer.

The current public Mac packages are not Apple-notarized yet. If macOS blocks the first opening, Control-click the package, choose **Open**, and approve it once.

The downloaded installers contain the FigureLoom Bio engine, local IDE, installer window, and test files. They do not download a second installer while the first installation is running.

## What appears on the desktop

- **Install or Update FigureLoom Bio**
- **FigureLoom Bio IDE**
- **Test FigureLoom Bio**
- **FigureLoom Bio Test Files**, already unzipped

The same apps also appear in the normal Windows Start Menu or macOS Applications folder.

## Use the installer window

Double-click **Install or Update FigureLoom Bio**. The window can:

- install or update FigureLoom Bio;
- repair the installed files by reopening the current official installer;
- open the IDE;
- open the test folder;
- run the quick test.

On Linux, the same window also checks missing basic Linux pieces. Optional scientific tools remain separate on every platform.

## Check that it works

Double-click **Test FigureLoom Bio**. A successful test report says that the quick test passed. Older installer text may show:

```text
EVERY QUICK TEST PASSED.
```

The test uses real CSV, FASTA, and FASTQ inputs and also checks a real SVG figure, alignment, and phylogenetic tree.

## Update later

Double-click **Install or Update FigureLoom Bio** and choose install, update, or repair. The updater downloads the current official installer for the operating system and opens the normal installation window.

## Open the IDE

Double-click **FigureLoom Bio IDE**. It starts the bundled local IDE and opens it through the computer's normal browser without sending program files to a server.

## Linux terminal fallback

The downloadable package is the normal installation method. The older terminal installer remains available only as a fallback for a Linux desktop that cannot open `.deb` packages:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```
