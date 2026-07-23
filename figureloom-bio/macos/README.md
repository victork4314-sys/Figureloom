# FigureLoom Bio macOS installer

Choose the package matching the Mac:

- **Apple Silicon** for M1, M2, M3, M4, M5, and newer Apple chips.
- **Intel** for Intel-based Macs.

Open the `.pkg` file and follow the normal macOS installer. It installs the language, native local IDE, updater/repair app, automatic test app, desktop app links, an unzipped `FigureLoom Bio Test Files` folder, and the `flbio` terminal command.

The installed apps are:

- **Install or Update FigureLoom Bio**
- **FigureLoom Bio IDE**
- **Test FigureLoom Bio**

The package runs the real CSV, FASTA, FASTQ, SVG, alignment, and phylogenetic-tree quick test before it finishes.

## Opening the unsigned package

The current public packages are not signed and notarized through Apple's paid developer program. macOS may therefore block the first opening even when the package downloaded correctly.

Use only the package from the official FigureLoom release link, then:

1. Open **Finder → Downloads**.
2. Try opening the downloaded `.pkg` normally.
3. If macOS blocks it, Control-click the package, choose **Open**, and approve the second **Open** prompt.
4. If it is still blocked, try opening it once, then open **Apple menu → System Settings → Privacy & Security**.
5. Scroll down to **Security** and press **Open Anyway** beside the FigureLoom Bio package message.
6. Enter the Mac login password or use Touch ID when asked, then press **Open** and finish the installer.

The **Open Anyway** option is normally available for about an hour after the blocked opening attempt. Once macOS accepts the package, the installed FigureLoom Bio apps open normally.
