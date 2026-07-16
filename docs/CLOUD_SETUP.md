# SciCanvas cloud accounts and collaboration

SciCanvas is connected to the Supabase project configured in [`../cloud-config.js`](../cloud-config.js). Local editing still works without signing in.

## What is live

- Email/password account creation and sign-in
- Email confirmation and confirmation-email resend
- Forgot-password email flow
- In-app new-password form after a recovery link
- Local project gallery without an account
- Encrypted cloud gallery for owned and shared projects
- Local/scoped profile pictures using initials or scientific symbols
- Owner, editor, reviewer and viewer permissions
- Pending invitations reserved by email address
- Automatic access activation when an invited email creates an account
- Expiring role-based collaboration links
- Private authenticated Realtime presence, cursors and encrypted project broadcasts
- Encrypted persistent review comments
- Row Level Security on every exposed application table

SciCanvas intentionally does **not** use Apple, Microsoft or other social sign-in providers. There is one account system to maintain: email and password.

## Live project configuration

The browser uses only the public project URL and publishable key:

```js
window.SCICANVAS_CLOUD_CONFIG = {
  supabaseUrl: 'https://yzjqciycdbnpnndxvpgq.supabase.co',
  supabaseAnonKey: 'sb_publishable_hHhDcLXqCmhJSA80NX0gtA_2L1lW4O0',
  redirectUrl: `${window.location.origin}${window.location.pathname}`,
  appName: 'SciCanvas'
};
```

A Supabase publishable key is designed for browser use. Access is enforced by database policies. Never put a secret key, service-role key, database password or SMTP credential in this repository.

## Database

[`../supabase/schema.sql`](../supabase/schema.sql) defines the account, encrypted project, membership, comment and Realtime foundation. [`../supabase/share-links.sql`](../supabase/share-links.sql) defines the deployed secure share-link extension.

Together they provide:

- `profiles`
- `projects`
- `project_members`
- `project_invitations`
- `project_share_links`
- `collaboration_comments`
- project-role and access helpers
- project-key derivation
- email invitation handling
- automatic pending-invitation activation
- expiring hashed share tokens
- RLS policies
- private Realtime authorization policies
- the Realtime publication for collaboration comments

The live project has these migrations and policies applied.

## Encryption model

Editable project payloads and shared-comment bodies are encrypted in the browser with AES-GCM before they are stored.

An authenticated database function checks project membership and derives a stable project-specific key from a random server-side master key in the non-exposed `private` schema. The browser receives only the derived key for a project the signed-in user is allowed to open.

This is application-layer encryption, not a zero-knowledge system. A database operator with privileged access can derive keys. Protect database credentials and backups accordingly.

Cloud gallery thumbnails are intentionally not stored. Project titles, ownership, timestamps, roles and revision numbers remain metadata so the gallery and permissions can work.

## Profile pictures

The profile button can use:

- the user's initials
- DNA
- flask
- molecule
- cell
- signal/wave
- scientific marker

The choice is stored locally for immediate display and is also synchronized into authenticated user metadata when signed in. It affects only the SciCanvas interface, never project artwork or exports.

## Email authentication

SciCanvas uses:

- `signUp()` for account creation
- `signInWithPassword()` for sign-in
- `resend({ type: 'signup' })` for confirmation-email resend
- `resetPasswordForEmail()` for forgotten passwords
- `PASSWORD_RECOVERY` plus `updateUser({ password })` for password replacement

The browser client uses the normal client-side redirect flow and detects the returned session in the app URL.

### Required Auth dashboard setting

In **Supabase Dashboard → Authentication → URL Configuration**, set:

- **Site URL:** `https://victork4314-sys.github.io/SciCanvas/`
- Add the same URL to **Redirect URLs**
- Add local URLs used during development, such as `http://localhost:8080/`

This setting is managed by Supabase Auth rather than PostgreSQL, so it is not part of the SQL files.

### Email delivery

Supabase's built-in mail service is suitable for initial testing but is rate-limited and best-effort. Before public use, configure a custom SMTP sender and test:

1. Account confirmation
2. Confirmation resend
3. Sign-in after confirmation
4. Forgot-password delivery
5. Recovery-link redirect
6. New-password replacement

## Invitations by email

Project owners can enter a collaborator's email and choose a role.

- Existing accounts receive access immediately.
- Unknown emails are stored as pending invitations.
- When that exact email creates an account, the membership is activated automatically.

SciCanvas reserves access by email but does not send a separate collaboration-invitation email. The owner should share the SciCanvas app link with the collaborator. Account confirmation and password-recovery emails are sent by Supabase Auth normally.

## Invitations by secure link

Project owners can also create a link for a viewer, reviewer or editor.

- The raw token appears only in the generated URL.
- Supabase stores only a SHA-256 hash of the token.
- The recipient must sign in before the link grants access.
- Links expire after 24 hours, 7 days or 30 days.
- Owners can revoke every active link for a project.
- Accepting a link never downgrades an existing stronger role.

The frontend uses:

- `create_project_share_link()`
- `accept_project_share_link()`
- `revoke_project_share_links()`

The live permission test verified link creation, reviewer membership, RLS project access, use tracking and revocation. Disposable test data was removed afterward.

## Roles

| Role | Open project | Presence/cursors | Comment | Edit/broadcast | Manage access |
|---|---:|---:|---:|---:|---:|
| Viewer | Yes | Yes | No | No | No |
| Reviewer | Yes | Yes | Yes | No | No |
| Editor | Yes | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes | Yes |

Incoming live edits pause when the local user is typing or dragging. The user chooses **Apply remote update** or **Keep mine** instead of being silently overwritten.

## Realtime

SciCanvas uses private channels:

- `project-room:<project UUID>` for authenticated presence and cursors
- `project-edit:<project UUID>` for encrypted project broadcasts

The policies on `realtime.messages` allow project members into room channels and restrict edit broadcasts to owners/editors. Persistent comments use Postgres Changes and ordinary table RLS.

Keep public Realtime channel access disabled in the project settings.

## Production checklist

- Set the production Site URL and redirect allow list.
- Configure and test a custom SMTP sender.
- Keep email confirmations enabled.
- Test owner, editor, reviewer and viewer accounts separately.
- Test email invitations and secure links separately.
- Test one project simultaneously in two browsers.
- Review Auth and database rate limits.
- Enable database backups.
- Keep the private encryption master key backed up with the database.
- Define account deletion, retention, privacy and breach-response policies.
- Re-run Supabase security and performance advisors after schema changes.

## Local-only behavior

If the Supabase configuration is removed or unavailable, the editor, autosave, recovery copies, `.scicanvas` backups and local project gallery continue to work. Cloud controls report the connection problem rather than replacing local project data.