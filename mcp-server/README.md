# FigureLoom MCP

FigureLoom includes a hosted Model Context Protocol connection backed by Supabase. Normal users do not install Node.js, run terminal commands, choose a bridge address, or manage a separate pairing token.

## Connect

1. Open the FigureLoom project that the assistant may access.
2. Sign in to the FigureLoom account.
3. Open **Settings → MCP & AI access**.
4. Choose **Read-only** or **Full editor access**.
5. Enable **Allow destructive actions** only when deletion should be permitted.
6. Press **Connect FigureLoom**.
7. Press **Copy MCP connection link** and add that link as a remote MCP server in the compatible client.

The copied link contains the revocable connection secret. There is no separate token or bridge address to enter. Keep the link private.

The FigureLoom project must remain open while an external client is actively operating the editor. The hosted server sends commands through Supabase Realtime to that exact open project.

## Security

- A connection is tied to the signed-in owner and exact project ID.
- Opening a different project does not inherit the authorization.
- Project changes revoke the old connection rather than carrying access forward.
- Only a SHA-256 hash of the connection secret is stored in the database.
- Read-only connections cannot execute write commands.
- Destructive commands require their own explicit permission.
- Commands expire when the editor does not answer.
- **Revoke connection** invalidates the copied link immediately.
- Browser writes execute through `FigureLoomCommands.execute`, including normal history and saving.

## Hosted architecture

```text
MCP-compatible client
        ↓ Streamable HTTP
Supabase Edge Function: figureloom-mcp
        ↓ authenticated command queue
Supabase Realtime
        ↓
Authorized open FigureLoom project
        ↓
FigureLoom command, history, and save layer
```

The hosted endpoint implements Streamable HTTP MCP. Each connection link authorizes one FigureLoom project and exposes the capabilities currently registered by that editor.

## Main tools

The server uses a compact set of composable tools such as:

- `get_session_access`
- `list_commands`
- `get_document_structure`
- `get_full_project`
- `get_page_state`
- `get_selected_objects`
- `render_page`
- `search_assets`
- `manage_project`
- `manage_page`
- `document_settings`
- `document_metadata`
- `create_object`
- `modify_object`
- `delete_objects`
- `duplicate_objects`
- `group_objects`
- `set_object_state`
- `edit_text`
- `apply_style`
- `replace_asset`
- `insert_asset`
- `import_svg`
- `manage_connector`
- `manage_templates`
- `import_content`
- `review_project`
- `manage_share`
- `run_ai_helper`
- `arrange_objects`
- `set_selection`
- `clipboard`
- `history`
- `set_view`
- `export_document`
- `execute_command`

`list_commands` exposes the editor command registry. New FigureLoom capabilities that register there can be called through `execute_command` without adding another single-purpose MCP endpoint.

## Visual verification

Use `render_page` to receive a rendered view of the currently active FigureLoom page in a supported format. Before capture, FigureLoom synchronizes the active page so the result reflects the latest project state.

The editor command registry also exposes current view and render commands for clients using `list_commands` and `execute_command`.

FigureLoom does not display an MCP pointer or arrow over the canvas. External activity must not intercept clicks or visually cover the project.

## Saving and undo

Create and modify operations return the affected object ID and geometry where supported.

```json
{
  "id": "object-id",
  "type": "shape",
  "geometry": {
    "x": 100,
    "y": 120,
    "w": 300,
    "h": 180,
    "rotation": 0
  }
}
```

Use `get_page_state` for the structured object tree and `render_page` for visual verification.

Successful browser write commands use the same command and history layer as editor actions. Before the command is reported as successful, FigureLoom synchronizes the active page and calls the normal durable save path so the edit is not left only in a pending render state.

## Revoking or disconnecting

- **Disconnect tab** takes the currently open editor offline while keeping the link available for later reconnection.
- **Revoke connection** permanently invalidates the copied link.
- Switching to another project revokes the previous project connection automatically.

## Troubleshooting

### The Connect button asks for sign-in

The hosted connection is tied to the FigureLoom account and exact project. Sign in through the account or project gallery, return to Settings, and press **Connect FigureLoom** again.

### The client says the editor is offline

Open the authorized FigureLoom project and press **Connect FigureLoom**. Keep that tab open while the client is editing.

### A write or delete is denied

Choose **Full editor access** for writes. Deletion additionally requires **Allow destructive actions**.

### An edit appears missing after reconnecting

Confirm that the command reported success, the save indicator completed, and the same cloud project was reopened. Check the project state and Undo history before sending the command again.

### The copied link stopped working

The connection may have been revoked or the project may have changed. Open the intended project, press **Connect FigureLoom**, and copy the new link.

## Developer-only local server

The repository still contains the earlier local TypeScript MCP server under `mcp-server/src` for development, testing, and self-hosting. It is not part of the normal FigureLoom connection flow. The hosted Supabase service is the user-facing implementation.

The GitHub workflow checks browser MCP modules, type-checks and builds the local TypeScript server, and exercises the isolated scratch workspace.
