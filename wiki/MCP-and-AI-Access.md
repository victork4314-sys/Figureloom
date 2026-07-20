# MCP and AI access

FigureLoom can connect the current project to an external assistant through the Model Context Protocol (MCP).

MCP is separate from Loomy. Loomy is the optional helper built into FigureLoom. MCP lets a compatible external client inspect or edit normal FigureLoom objects through the same command, history, and saving systems used by the editor.

## What you need

- A FigureLoom account signed in inside the editor
- The project you want the assistant to use open in the current tab
- An MCP-compatible client that accepts a remote MCP server address

The hosted FigureLoom connection does not require a local bridge, terminal command, or separate server process on your device.

## Connect a project

1. Open the project in FigureLoom.
2. Open **Settings**.
3. Choose **MCP & AI access**.
4. Choose an access level.
5. Leave **Allow destructive actions** off unless the client genuinely needs to delete objects, pages, or projects.
6. Press **Connect FigureLoom**.
7. Press **Copy MCP connection link**.
8. Add that link as the remote MCP server address in your MCP client.
9. Keep the FigureLoom tab open while the client is working.

Client setup screens differ, but the copied link is the complete connection address. There is no second pairing token to enter.

## Access levels

### Read-only

Read-only access can inspect the current document, pages, objects, selection, view state, available assets, and supported commands. It can also request a render of the current page where the client supports returned files or images.

Read-only access cannot change the project.

### Full editor access

Full access lets the client use the write commands currently registered by FigureLoom. Depending on the active tools, that can include creating and editing objects, arranging content, working with pages, changing styles, and using supported import, export, data, or scientific-tool actions.

Successful write commands use FigureLoom's normal history and save paths. They are not a separate hidden document state.

### Destructive actions

Deleting objects, pages, projects, or clearing a document requires the separate **Allow destructive actions** switch. Full access alone does not authorize those commands.

Keep this switch off for ordinary layout and editing work.

## The connection belongs to one project

A hosted MCP connection is tied to the account and the exact project that was open when it was created.

Switching to another project revokes the old project authorization rather than silently carrying the assistant into the new project. Create a new connection from the new project when needed.

## Connection link safety

The copied MCP connection link contains its authorization. Treat it like a private access link.

- Do not paste it into public issues, chat rooms, screenshots, or documentation.
- Revoke it when the session is finished or when it may have been exposed.
- Use read-only access when the assistant only needs context.
- Review the project before enabling destructive actions.

FigureLoom only executes commands while the project connection is active. The editor checks the selected access level again before each command runs.

## Disconnect and revoke

**Disconnect tab** stops the current editor tab from processing MCP work but keeps the connection available for reconnection.

**Revoke connection** invalidates the copied link. A client using that link loses future access immediately.

Create a new connection to obtain a new private link.

## What the assistant can see

The available MCP tools come from the FigureLoom command registry in the open editor. A client can ask for the command list instead of assuming that every deployment or project has identical tools.

Typical read tools cover:

- Document and page structure
- Objects and selections
- Undo and redo availability
- View, grid, and guide state
- Asset search
- Current-page SVG or PNG rendering

Write tools are exposed only when full access is selected. Destructive tools remain separately protected.

## Troubleshooting

### The Connect button asks me to sign in

Open the account panel, sign in, return to **Settings → MCP & AI access**, and press **Connect FigureLoom** again.

### The client says the server is offline

Keep the matching FigureLoom project open and confirm that the settings status says **Connected**. Press **Reconnect FigureLoom** when the hosted connection exists but the tab has gone offline.

### The client can read but cannot edit

The connection was created as read-only. Reconnect it with **Full editor access**.

### A delete command is refused

Destructive actions are off. Enable them only when deletion is intentional, then reconnect or refresh the connection settings.

### The link stopped working after changing projects

That is expected. The old authorization is revoked when the active project changes. Create a connection from the new project.

### The assistant does not know which tools exist

Ask it to list the available FigureLoom commands first. The editor publishes the current command names and input descriptions to the MCP connection.

## MCP and Loomy

Loomy is useful for creating a starting layout inside FigureLoom. MCP is useful when you want an external compatible assistant to inspect the real project, use normal editor tools, and continue working through a controlled project-specific connection.

Neither is required for ordinary FigureLoom editing.