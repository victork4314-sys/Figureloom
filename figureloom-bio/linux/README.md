# FigureLoom Bio on Linux and Kasm

## Kasm server: one pasted command

Run this in the Kasm server console. No workspace session needs to be running.

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-kasm-image.sh | sudo bash
```

The installer builds and tests this image:

```text
kasmweb/ubuntu-noble-desktop:figureloom-linux-public-flbio
```

Use that exact value as the **Docker Image** for the FigureLoom Linux workspace in Kasm.

The image contains:

- FigureLoom Bio 0.8.0;
- a desktop and application-menu icon named **Install or Update FigureLoom Bio**;
- a desktop and application-menu icon named **FigureLoom Bio IDE**;
- a desktop icon named **Test FigureLoom Bio**;
- an unzipped desktop folder named **FigureLoom Bio Test Files**;
- `flbio test-files` to recreate the folder;
- `flbio quick-test` to run the automatic test.

## Any normal Ubuntu or Debian desktop: one pasted command

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```

The first command adds the desktop installer. After that, ordinary users can double-click **Install or Update FigureLoom Bio** instead of pasting commands again.

The window can:

- install the current version;
- update an existing installation;
- repair missing launchers or desktop files;
- install only missing basic Linux pieces such as Python venv or the installer-window support;
- run the real CSV, FASTA, FASTQ, figure, alignment, and tree test;
- open the local IDE;
- open the unzipped desktop test folder.

The language itself still has one built-in capability list. This installer does not add a package or add-on system to `.flbio`.

## What the installer checks

Before reporting success, it checks the required Linux pieces, installs FigureLoom Bio in its isolated environment, copies the local IDE, creates all three desktop launchers, creates the test folder, runs `flbio doctor`, and executes `flbio quick-test`.

A desktop browser is required for the local IDE window. Chromium, Google Chrome, Firefox, and Firefox ESR are supported. Optional external bioinformatics programs are not silently installed.

## Different Kasm image names

```bash
sudo bash install-kasm-image.sh EXISTING_IMAGE NEW_IMAGE
```

Example:

```bash
sudo bash install-kasm-image.sh \
  kasmweb/ubuntu-noble-desktop:figureloom-linux-public-boot-fixed \
  kasmweb/ubuntu-noble-desktop:figureloom-linux-public-flbio
```

The Kasm installer checks the updater, IDE, quick-test launcher, unzipped test folder, and a real language run inside the finished image before reporting success.
