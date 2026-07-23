# Install FigureLoom Bio

FigureLoom Bio installs like a normal Linux desktop program. There is no terminal command in the normal setup.

[Download FigureLoom Bio](https://github.com/victork4314-sys/Figureloom/releases/download/figureloom-bio-installer/FigureLoom-Bio-Installer.deb)

## Install it

1. Press **Download FigureLoom Bio** above.
2. Open `FigureLoom-Bio-Installer.deb` from the Downloads folder.
3. Press **Install** and approve the normal Linux administrator prompt.

The downloaded file contains the FigureLoom Bio engine, local IDE, installer window, and test files. It does not download a second installer while it is being installed.

Inside Kasm, open this page in the running workspace, download the same file, and open it there. FigureLoom Bio is installed only because that user chose to install it. Nothing is preinstalled into or baked into the Kasm image.

## What appears on the desktop

- **Install or Update FigureLoom Bio**
- **FigureLoom Bio IDE**
- **Test FigureLoom Bio**
- **FigureLoom Bio Test Files**, already unzipped

## Use the installer window

Double-click **Install or Update FigureLoom Bio**. The window shows whether the engine, IDE, launchers, browser support, and test files are ready. It installs only missing basic Linux pieces and leaves optional scientific tools alone.

The window can:

- install or update FigureLoom Bio;
- repair missing launchers or files;
- open the IDE;
- open the test folder;
- run the quick test.

## Check that it works

Double-click **Test FigureLoom Bio**. A successful test ends with:

```text
EVERY QUICK TEST PASSED.
```

The test uses real CSV, FASTA, and FASTQ inputs and also checks figures, alignment, and a tree.

## Update later

Double-click **Install or Update FigureLoom Bio** and choose update or repair. You do not need to download the package again for normal updates.

## Open the IDE

Double-click **FigureLoom Bio IDE**. It opens locally in its own app window without normal browser tabs or an address bar.

## Terminal fallback

The downloadable package is the normal installation method. The older terminal installer remains available only as a fallback for a Linux desktop that cannot open `.deb` packages:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```
