# Resize and dedup validation

This branch triggers validation for the production resize and built-in-library deduplication changes already present on `main`.

Manual checks:

- Select a canvas object and confirm eight resize handles appear.
- Drag side and corner handles and confirm position/size fields update.
- Hold Shift while dragging a corner and confirm proportions are retained.
- Undo and redo a resize.
- Open Science and confirm only distinct built-in drawings appear.
- Search for specialist aliases such as `E. coli`, `Pseudomonas`, `macrophage`, and `confocal` and confirm the matching base drawing remains discoverable.
- Confirm the 2,829-SVG Bioicons browser remains available.