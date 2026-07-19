# Projects, saving, and recovery

FigureLoom supports local projects without an account and encrypted cloud projects when an account is connected.

## Local projects

Local projects are stored in the browser. FigureLoom saves changes continuously and keeps recovery information for unexpected reloads or crashes.

Local storage is convenient, but it belongs to that browser profile on that device. It is not a substitute for a separate backup file.

## Naming a project

Select the project name at the top of the editor.

A useful name makes the project easier to find in the Projects panel and produces better download filenames. Avoid giving several projects the same name unless they are intentionally separate copies.

## Projects panel

Open **Projects** to see current and recently opened work.

Depending on the project state and account connection, the panel can include:

- New project
- Open project
- Local project gallery
- Cloud project gallery
- Save or update cloud copy
- Import project backup
- Close project tab
- Current project status

## Project tabs

Several projects can be open in separate project tabs.

Before switching or closing a project:

- Wait for the save indicator to settle.
- Download a backup after major changes.
- Avoid opening the same local project in several browser tabs at once.

Closing a project tab removes it from the current workspace. It does not necessarily delete the saved project.

## Autosave

Autosave stores the editable project state after changes.

Autosave covers normal editor data such as:

- Pages and page order
- Objects and layers
- Text and styling
- Chart and table data
- Comments and references
- Project settings
- Components and checkpoints
- Imported assets stored with the project

A save indicator can briefly show that work is being written. Do not close the browser during a large import or immediately after a major change.

## Recovery snapshots

FigureLoom keeps rotating recovery snapshots. These are intended for situations such as:

- Browser crash
- Accidental reload
- A broken import
- A large edit that needs to be rolled back
- An incomplete project state after an interruption

Open the recovery workspace in Pro Tools to inspect available snapshots.

Before restoring a snapshot, download the current project if it still opens. This preserves both versions.

## Named checkpoints

Named checkpoints are deliberate versions created during a project.

Good times to make a checkpoint include:

- Before a large layout change
- Before replacing a chart data set
- Before a coauthor review
- Before changing page format
- Before final export

Checkpoints can also support change highlighting between versions.

## Downloading a complete backup

Open **Export** and choose the complete editable project download.

The resulting `.figureloom` file is the safest portable copy of the project. It can be stored in cloud drive storage, a lab folder, a versioned archive, or another device.

A project backup is different from SVG, PNG, or PowerPoint export. Those formats are for output. The `.figureloom` file is for reopening and continuing the project.

## Importing a backup

Use the project import action and select a `.figureloom` file.

Older FigureLoom backups are also accepted. After importing an older project, download a new `.figureloom` copy to update the portable backup.

If the imported project has the same name as an existing project, rename one of them immediately.

## Moving a project to another device

1. Open the project on the original device.
2. Download the editable `.figureloom` backup.
3. Transfer the file using a trusted method.
4. Open FigureLoom on the new device.
5. Import the project backup.
6. Confirm the pages, objects, fonts, charts, and images.
7. Download a fresh backup from the new device.

Local fonts installed only in the old browser may need to be imported again.

## Local project gallery

The local gallery lists projects stored in the browser.

Use it to open, rename, duplicate, or remove local work. Removing a local project can be permanent if no backup exists.

Before deleting anything from the gallery, confirm that the correct `.figureloom` file has been downloaded and can be found outside the browser.

## Cloud projects

When signed in, a project can be explicitly saved to the encrypted cloud gallery.

Cloud saving is not a silent replacement for local saving. The user chooses when to create or update a cloud copy.

Cloud projects include metadata needed for the gallery, such as title, owner, timestamps, roles, and revision information. The editable project payload is encrypted in the browser before storage.

See [Accounts, cloud projects, and collaboration](Accounts-Cloud-and-Collaboration).

## Conflicts and remote updates

When another editor sends an update, FigureLoom pauses incoming changes while the local user is typing or dragging.

The user can choose to:

- Apply the remote update
- Keep the local version

This avoids silently replacing active work.

## Before clearing browser data

Download backups of every local project first.

Clearing site data, using aggressive privacy cleanup, deleting the browser profile, or uninstalling the browser can remove local projects, preferences, recovery copies, imported fonts, and personal asset libraries.

## Recommended backup routine

For ordinary work:

- Keep browser autosave enabled.
- Download a project backup at the end of each session.
- Make named checkpoints before major edits.
- Keep at least one backup outside the device.
- Use cloud projects for collaboration, not as the only copy.

For important publication work, keep dated backups such as:

```text
Figure-2-treatment-response-2026-07-19.figureloom
Figure-2-treatment-response-2026-07-22-review.figureloom
Figure-2-treatment-response-final-submission.figureloom
```