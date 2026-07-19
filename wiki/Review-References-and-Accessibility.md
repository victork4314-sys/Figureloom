# Review, references, and accessibility

FigureLoom includes review tools for catching layout problems, collecting sources, documenting changes, and making figures easier to understand.

## Comments

Comments can be attached to a page or object.

Use comments for:

- Requested changes
- Questions about data or labels
- Missing source information
- Layout decisions
- Coauthor review
- Final checks before submission

A comment can be resolved when the issue is addressed and reopened if it needs more work.

## Navigating comments

The review workspace can move to the page or object associated with a comment.

Use descriptive comment text. `Fix this` is less useful than `Increase the y-axis label size and add the unit`.

## Persistent collaboration comments

In a shared cloud project, authorized users can create persistent encrypted review comments.

Role permissions affect who can comment and who can edit. See [Accounts, cloud projects, and collaboration](Accounts-Cloud-and-Collaboration).

## References

Reference records can include:

- DOI
- Creator
- Title or source
- URL
- License
- Attribution text
- Notes

References can be added manually or collected from inserted artwork when metadata is available.

## Automatic reference collection

When a used asset contains source metadata, FigureLoom can add it to the project reference list.

Automatic collection helps, but it is not a substitute for checking the source. Confirm that:

- The creator is correct.
- The license applies to the version used.
- The required attribution wording is present.
- A stable source URL is included.
- The final publication format satisfies the license.

## Downloading references

Use the reference export action to download the collected list.

The output can be used as a starting point for:

- Figure attribution
- Supplementary methods
- Acknowledgements
- Internal asset records

Format the final citations according to the journal or institution.

## Named checkpoints

A named checkpoint records a deliberate project state.

Useful names include:

- Before reviewer changes
- Data corrected
- Journal resize
- Final labels
- Submission version

## Change highlighting

Comparison tools can highlight added or changed objects between checkpoints.

This is useful for visual review, but it is not a formal version-control system. Keep separate project backups for important milestones.

## Overall alt text

Alt text gives a short description of the figure's purpose and main information.

A useful alt text usually answers:

- What kind of figure is this?
- What is being compared or shown?
- What is the main conclusion or structure?

Avoid listing every decorative detail.

## Long description

A long description can explain complex structure that does not fit into short alt text.

It can include:

- Panel order
- Axes and variables
- Important trends
- Pathway direction
- Legend meaning
- Spatial arrangement
- Key values

## Automatic description draft

FigureLoom can create a starting description from page layers and labels.

Treat it as a draft. Check scientific meaning, reading order, abbreviations, and conclusions manually.

## Layer names and accessibility

Descriptive layer names improve the automatic draft and make project review easier.

Use `Treatment group label` rather than `Text 14` when possible.

## Contrast check

The contrast check looks for text and color combinations that may be difficult to read.

A warning does not always mean the design is unusable, and a pass does not guarantee accessibility. Inspect the final export at the real display or print size.

## Small-text check

Small text can become unreadable after a figure is reduced.

Run the check after choosing the final page dimensions. A font size only has meaning relative to the physical output size.

## Grayscale preview

Grayscale preview shows whether groups remain distinguishable without color.

Use it to identify:

- Similar brightness values
- Legends that depend only on hue
- Lines that disappear
- Backgrounds that reduce contrast

## Color-vision previews

Available previews can include:

- Protanopia
- Deuteranopia
- Tritanopia

Use these as design aids. Add marker shapes, line styles, labels, or pattern differences when color distinctions become unclear.

## Publication readiness check

The readiness check can warn about:

- Unresolved comments
- Missing alt text
- Off-canvas objects
- Small print text
- Broken connectors
- External images
- Incomplete references
- Other export or project issues

The report is not journal certification. Always verify current submission rules.

## Downloadable readiness report

Download the report when you need a record of the checks performed or want to share outstanding issues with a collaborator.

Resolve warnings where appropriate, then rerun the check.

## Panel labels

Use consistent panel labels such as A, B, C, and D.

Check:

- Position
- Font
- Size
- Capitalization
- Reading order

Panel labels should not rely on color alone.

## Legends

A legend should explain symbols, lines, colors, patterns, and abbreviations that are not obvious.

Keep it close enough to the related content and large enough to read at final size.

## Scale bars

A scale bar must match the source image and analysis.

FigureLoom can draw and label the bar, but it does not calculate a scientifically valid scale from an image automatically. Use the correct calibration from the original software.

## Review workflow

A practical review sequence is:

1. Create a named checkpoint.
2. Run publication checks.
3. Add or collect references.
4. Draft alt text and a long description.
5. Invite reviewers or share an export.
6. Resolve comments.
7. Compare the revised project with the checkpoint.
8. Download a fresh `.figureloom` backup.
9. Export the final files.
10. Inspect the files outside FigureLoom.

## Accessibility checklist

Before final export:

- Text is readable at final size.
- Contrast is sufficient.
- Color is not the only distinction.
- Reading order is logical.
- Alt text explains the purpose.
- Long description covers complex details.
- Legends define symbols and abbreviations.
- Links and references are complete.
- Decorative content does not distract from data.
- The exported file is checked in its final viewer.