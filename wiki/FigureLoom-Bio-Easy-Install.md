# Install FigureLoom Bio

FigureLoom Bio installs like a normal desktop program. There is no terminal command in the normal setup.

## Download for your computer

- [Download FigureLoom Bio for Linux](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-installer/FigureLoom-Bio-Installer.deb)
- [Download FigureLoom Bio for Windows](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-windows-installer/FigureLoom-Bio-Installer.exe)
- [Download FigureLoom Bio for Mac, Apple Silicon](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Apple-Silicon.pkg)
- [Download FigureLoom Bio for Mac, Intel](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-macos-installer/FigureLoom-Bio-Installer-macOS-Intel.pkg)

Apple Silicon means an M1, M2, M3, M4, M5, or newer Apple-chip Mac. Use the Intel package only on an Intel Mac.

> **Installing on a Mac:** the current Mac packages are not signed and notarized through Apple's paid developer program. macOS may show a developer or security warning even when the package was downloaded correctly. Download it only from the official links above, then follow the Mac steps below if macOS blocks it.

The direct installer links stay together in this **Download for your computer** section. They are not repeated beside the wiki search bar or as separate download entries in the navigation.

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

1. Download the Apple Silicon or Intel package above.
2. Open **Finder → Downloads** and locate the downloaded `.pkg` file.
3. Try opening the package normally. If the installer opens, press **Continue** and follow the normal installation steps.
4. If macOS blocks it, Control-click the `.pkg`, choose **Open**, and approve the second **Open** prompt.
5. If it is still blocked, try opening the package once so macOS records the attempt. Then open **Apple menu → System Settings → Privacy & Security**.
6. Scroll down to **Security**, find the message about the FigureLoom Bio package, and press **Open Anyway**. This option normally remains available for about an hour after the blocked opening attempt.
7. Enter the Mac login password or use Touch ID when asked, press **Open**, and finish the normal installer.

The warning appears because the package is distributed independently and is not currently Apple-notarized. It does not mean FigureLoom Bio is a browser app or that the installer is incomplete. After macOS accepts it once, the installed FigureLoom Bio apps open normally.

The downloaded installers contain the FigureLoom Bio engine, native desktop IDE, installer window, and test files. They do not download a second installer while the first installation is running.

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

The quick test uses real CSV, FASTA, and FASTQ inputs and also checks a real SVG figure, alignment, and phylogenetic tree.

The separate exhaustive language audit runs all **161 canonical sentences** and all **99 accepted alternate wordings** through the real parser and runtime. The generated [complete command reference](FigureLoom-Bio-Command-Reference) lists all 260 tested sentences.

## Update later

Double-click **Install or Update FigureLoom Bio** and choose install, update, or repair. The updater downloads the current official installer for the operating system and opens the normal installation window.

## Open the IDE

Double-click **FigureLoom Bio IDE**. It opens the native FigureLoom Bio desktop application directly. The Windows and macOS IDE does not open a browser, start a localhost server, use a WebView, or bundle an HTML interface.

Programs and device projects stay on the computer unless the user explicitly signs into the shared FigureLoom account and saves an encrypted project to Bio cloud.

## Linux terminal fallback

The downloadable package is the normal installation method. The older terminal installer remains available only as a fallback for a Linux desktop that cannot open `.deb` packages:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```
