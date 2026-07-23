# Install FigureLoom Bio

FigureLoom Bio can be installed like a normal desktop program. The first command adds an installer window, the local IDE, an unzipped test folder, and a one-click test.

## First installation

Open a terminal in Linux or in your running Kasm workspace and paste:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```

Inside Kasm, use the terminal inside the workspace. This does not rebuild or replace the Kasm image.

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

Double-click **Test FigureLoom Bio**, or run:

```bash
flbio quick-test
```

A successful test ends with:

```text
EVERY QUICK TEST PASSED.
```

The test uses real CSV, FASTA, and FASTQ inputs and also checks figures, alignment, and a tree.

## Update later

Double-click **Install or Update FigureLoom Bio** and choose update or repair. There is no need to repeat the full manual installation guide.

## Open the IDE

Double-click **FigureLoom Bio IDE**. It opens locally in its own app window without normal browser tabs or an address bar.
