# Install FigureLoom Bio without the complicated steps

FigureLoom Bio now has a normal setup window. After the first installation, updating or repairing it is a double-click job.

## Linux or Kasm

For the first installation, open the server console or a Linux terminal and paste this one command:

```bash
curl -fsSL https://raw.githubusercontent.com/victork4314-sys/Figureloom/main/install/figureloom-bio-linux.sh | sudo bash
```

That installs or updates all of these together:

- the `flbio` terminal command;
- the local FigureLoom Bio IDE;
- an **Install or Update FigureLoom Bio** desktop icon;
- a **FigureLoom Bio IDE** desktop icon;
- an already-unzipped **FigureLoom Bio Test Files** folder;
- a **Run FigureLoom Bio Quick Test** desktop icon.

It does not reinstall the large bioinformatics tool collection already present in FigureLoom Linux.

## The setup window

Double-click **Install or Update FigureLoom Bio**.

The window checks:

- Python;
- Git;
- the local browser used for the app window;
- the FigureLoom Bio terminal engine;
- the visual IDE;
- the bundled test files;
- the optional advanced bioinformatics tools.

Press **Install** or **Update / Repair**. Missing required pieces are installed automatically. Anything already working is left alone.

When setup finishes, the same window provides buttons for:

- **Open IDE**
- **Open Test Files**
- **Run Quick Test**

The optional bioinformatics tools are reported separately. They are not needlessly reinstalled when the machine already has them.

## Kasm image installation

Run the first-install command in the temporary image-building container or Dockerfile layer. No user workspace needs to be running.

After the command finishes, save or commit the image and select that image in the FigureLoom Linux Kasm workspace.

The installer writes the desktop files into:

- `/home/kasm-default-profile/Desktop`
- `/etc/skel/Desktop`
- existing user desktop folders under `/home`

That makes the setup window, IDE, quick test, and unzipped test folder appear in new Kasm sessions.

## Check it

Double-click **Run FigureLoom Bio Quick Test**.

The final line should say:

```text
EVERY QUICK TEST PASSED.
```

Double-click **FigureLoom Bio IDE** to open the visual IDE in its own app window, without normal browser tabs or an address bar.

## Update it later

Double-click **Install or Update FigureLoom Bio**, then press **Update / Repair**.

Pasting the first-install command again also updates the existing installation rather than making another copy.
