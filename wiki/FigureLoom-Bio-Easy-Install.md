# Install FigureLoom Bio without the complicated steps

## Linux or Kasm

Open the server console or a Linux terminal and paste this one command:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/install/figureloom-bio-linux.sh | sudo bash
```

That installs or updates all of these together:

- the `flbio` terminal command;
- the local FigureLoom Bio IDE;
- a **FigureLoom Bio IDE** desktop icon;
- an already-unzipped **FigureLoom Bio Test Files** folder;
- a **Run FigureLoom Bio Quick Test** desktop icon.

It does not reinstall the large bioinformatics tool collection already present in FigureLoom Linux.

## Kasm image installation

Run the same command in the temporary image-building container or Dockerfile layer. No user workspace needs to be running.

After the command finishes, save or commit the image and select that image in the FigureLoom Linux Kasm workspace.

The installer writes the desktop files into:

- `/home/kasm-default-profile/Desktop`
- `/etc/skel/Desktop`
- existing user desktop folders under `/home`

That makes them appear in new Kasm sessions.

## Check it

Double-click **Run FigureLoom Bio Quick Test**.

The final line should say:

```text
EVERY QUICK TEST PASSED.
```

Double-click **FigureLoom Bio IDE** to open the visual IDE in its own app window.

## Update it later

Paste the same install command again. It updates the existing installation rather than making another copy.
