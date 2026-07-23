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
- a desktop and application-menu icon named **FigureLoom Bio IDE**;
- a desktop icon named **Test FigureLoom Bio**;
- an unzipped desktop folder named **FigureLoom Bio Test Files**;
- `flbio test-files` to recreate the folder;
- `flbio quick-test` to run the automatic test.

## Any normal Linux desktop: one pasted command

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/figureloom-bio/linux/install-linux.sh | sudo bash
```

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

The Kasm installer runs `flbio doctor`, checks both desktop launchers, checks the unzipped test folder, and executes `flbio quick-test` inside the finished image before reporting success.
