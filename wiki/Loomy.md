# Loomy

Loomy is an optional helper for getting a first editable layout onto the canvas.

FigureLoom is not an AI-first editor. Text, shapes, illustrations, charts, maps, imports, exports, and Pro Tools work without Loomy.

## What Loomy does

Loomy can turn a written description into a starting arrangement of normal FigureLoom objects.

Useful prompt types include:

- Pathway
- Cycle
- Workflow
- Comparison
- Environmental system
- Laboratory process
- Host-pathogen interaction
- PCR or sequencing workflow
- Wastewater treatment flow
- Biofilm process
- General labeled diagram

## What Loomy does not do

Loomy is not meant to create one flattened picture that cannot be edited.

It does not replace:

- Scientific judgment
- Statistical analysis
- Image analysis
- Citation checking
- Journal compliance review
- Manual layout cleanup

## Opening Loomy

Open Loomy from the top actions, Pro Tools, or **More** on a phone, depending on the current interface.

## Basic workflow

1. Describe the figure.
2. Include the main objects or stages.
3. State the relationship type.
4. Choose a layout when available.
5. Generate the starting figure.
6. Inspect every label and object.
7. Rearrange, recolor, resize, or delete anything that is wrong.
8. Add references and accessibility text.

## Writing a useful prompt

A good prompt describes structure rather than only a topic.

Less useful:

```text
Make a cancer figure.
```

More useful:

```text
Create a left-to-right pathway with tumor cells on the left, cytokine release in the center, T-cell recruitment on the right, and inhibitory feedback returning to the tumor. Use editable arrows and short labels.
```

## Prompt ingredients

Include:

- Direction, such as left to right or circular
- Major stages
- Important labels
- Relationships
- Groups or compartments
- Desired level of detail
- Any object that must be present

## Example: workflow

```text
Create a five-step horizontal workflow: collect water sample, filter sample, extract DNA, run qPCR, report result. Add a short label under each step and connect the steps with arrows.
```

## Example: comparison

```text
Create a two-column comparison of aerobic and anaerobic treatment. Put oxygen, main organisms, products, and energy yield in matching rows. Keep the objects editable.
```

## Example: cycle

```text
Create a circular nitrogen cycle with fixation, nitrification, assimilation, ammonification, and denitrification. Use curved arrows and leave room for organism icons.
```

## Example: host-pathogen

```text
Create a host-pathogen figure with epithelial barrier at the top, bacterial attachment, invasion, innate immune signaling, neutrophil recruitment, and tissue damage. Use separate compartments and anchored connectors.
```

## Deterministic layout

The ordinary helper can use rule-based layout and asset matching inside the browser.

This means the starting result can still work when no external model is available.

## Optional prompt interpretation

Some deployments or browsers can offer an optional provider or on-device prompt interpreter.

Its job is to turn vague wording into clearer layout instructions. The final figure is still built from editable FigureLoom objects.

Provider availability, quotas, and privacy behavior depend on the selected provider and deployment.

## Provider selection

When provider choices are visible, select the provider deliberately.

Do not assume that every provider has the same:

- Quota
- Privacy behavior
- Availability
- Output style
- Error messages

If a provider fails, the deterministic helper or another available provider can still be used where supported.

## Editing the result

Treat generated output as a draft.

Check:

- Scientific accuracy
- Missing stages
- Incorrect direction
- Duplicated labels
- Oversized objects
- Objects outside the page
- Connector attachment
- Color meaning
- References
- Alt text

## Making a generated figure fit

If the result is too large:

1. Select the generated objects.
2. Group them if needed.
3. Resize from a corner.
4. Use Align and Distribute.
5. Increase the page size only when the final output allows it.
6. Split the content into several pages or panels when necessary.

The helper should not create false canvas area. The page bounds remain the real export bounds.

## Using scientific artwork

Loomy can search available illustration libraries for matching objects.

Review every chosen asset. A search match can be visually related without being the scientifically correct object.

## Privacy

Read the provider information before sending sensitive text.

Do not include:

- Patient identifiers
- Unpublished confidential results
- Passwords or tokens
- Restricted data
- Private collaborator information

The deterministic in-browser workflow avoids sending the prompt to a FigureLoom server. Optional providers can have their own data handling.

## Common problems

### Nothing appears

- Check whether the prompt contains a recognizable structure.
- Try a simple workflow prompt.
- Switch provider if the current one is unavailable.
- Use the deterministic option where available.
- Reload after saving the project.

### The output is scientifically wrong

Delete or replace the wrong parts. Loomy is a layout helper, not an authority.

### The output is too large

Group and resize it, choose a simpler prompt, or divide the content into panels.

### Labels overlap

Use Align and Distribute, widen the page area, shorten labels, or move labels manually.

### A quota message appears unexpectedly

Confirm which provider is selected. Provider-specific quota messages should not be treated as a project error.

## Best use of Loomy

Loomy is most useful for overcoming the blank-page problem. Use it to create a rough structure, then finish the work with the normal editor.