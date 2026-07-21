# Illustration packs and licensing

FigureLoom separates its original built-in drawings from external illustration packs. Every imported external asset should retain its source, author, license, source URL, and attribution text inside the editable project when that information is available.

## Integrated pack: Bioicons

FigureLoom can load the Bioicons search index at runtime and browse entries from inside the illustration library.

- Source: https://bioicons.com/
- Repository: https://github.com/duerrsimon/bioicons
- Complete source package: https://github.com/duerrsimon/bioicons/archive/refs/heads/main.zip
- Machine-readable index: `static/icons/icons.json` in the Bioicons repository
- Format: SVG
- License model: per icon, including licenses such as CC0, CC BY, CC BY-SA, MIT, and BSD

When a Bioicon is added to a canvas, FigureLoom can:

1. Download the individual SVG.
2. Remove scripts, event handlers, embedded foreign objects, and unsafe external references.
3. Embed the cleaned SVG inside the project.
4. Store available name, category, author, author URL, license, license URL, source URL, and attribution wording in object metadata.
5. Include the asset in the detailed attribution report.

The search index can be cached locally. Individual SVGs are embedded only when used, which avoids downloading an entire outside library into every project.

## Servier Medical Art

Servier Medical Art provides downloadable slide-set packages and category-specific PowerPoint kits.

- Library: https://smart.servier.com/
- Category kits: https://smart.servier.com/image-kits-by-category/
- Complete package: https://smart.servier.com/wp-content/uploads/ServierMedicalArt-all-kits.zip
- License: CC BY 4.0

FigureLoom may link to this source rather than unpacking the full PowerPoint archive in the browser. Individual exported images can be imported into the personal asset library and given source and license metadata.

## NIH BioArt Source

- Library: https://bioart.niaid.nih.gov/
- Terms: https://bioart.niaid.nih.gov/terms

NIH BioArt Source contains scientific illustrations, vectors, brushes, swatches, and templates. Check the current terms and attribution requirements for each item before use. FigureLoom should not assign one blanket license to the entire collection when the source terms require item-level review.

## Reactome Icon Library

- Library: https://reactome.org/icon-lib
- License information: https://reactome.org/license

Reactome is a pathway-oriented source. Import assets only after checking the applicable source, license, citation, and icon guidance.

## Other compatible libraries

FigureLoom can expose other compatible artwork libraries when the deployment or current build includes them.

For every outside library:

- Keep the original source URL.
- Keep the author or organization name.
- Keep the exact license name and URL.
- Preserve prepared attribution wording where provided.
- Do not assume that every item in a library uses the same license.
- Recheck the current source terms before publication.

## Attribution reports

FigureLoom can collect attribution records for built-in, user-supplied, and outside-pack content where metadata exists.

The detailed asset attribution output can include:

- Asset name
- Author or organization
- License
- License URL
- Original source
- Prepared credit wording

Attribution reports help with recordkeeping but do not replace checking the current source terms, journal instructions, or institutional policy before publication.
