# Manual test checklist

Use this checklist after a GitHub Pages deployment or before publishing a release.

## Application shell

- Open the deployed app without console errors.
- Confirm the ribbon, page panel, canvas, layers panel, and inspector are visible.
- Reload once so the latest service worker takes control.

## Built-in editing

- Add text, a shape, an arrow, and a built-in science object.
- Drag an object and confirm grid/object snapping can be toggled.
- Change position, size, fill, stroke, opacity, and rotation.
- Duplicate, reorder, hide, and delete an object.
- Undo and redo the changes.

## Illustration packs

- Open **Science → Packs**.
- Confirm the Bioicons index reports approximately 2,829 entries.
- Search for `bacteria`, `virus`, `microscope`, and `mitochondria`.
- Filter by category and licence.
- Add one CC0 icon and one attribution-required icon.
- Reload the app and confirm the imported SVGs remain embedded in the project.
- Download the detailed attribution report and confirm it contains each icon's name, author, licence, and source URL.
- Confirm the whole-package links for Bioicons and Servier Medical Art open correctly.

## Upload vault and recovery

- Upload PNG and SVG files.
- Confirm they appear in **My uploads** and can be reused.
- Create a recovery snapshot.
- Download a `.scicanvas` project, reload, and import it.
- Confirm all embedded images and pages return.

## Export

- Export SVG.
- Export standard and high-resolution PNG.
- Verify the optional editor grid setting.

## Offline behavior

- Load the app online, then disconnect the device.
- Reload and confirm the application shell opens.
- Confirm previously embedded project assets remain available.
- Remote pack search and new remote SVG downloads should clearly fail when offline rather than losing the current project.
