# Privacy, security, and offline use

FigureLoom is local-first. The normal editor can work without an account, and local projects stay in the browser unless the user deliberately saves or shares them elsewhere.

## Local project data

Local storage can contain:

- Projects
- Autosave state
- Recovery snapshots
- Local gallery entries
- Uploaded images and SVG files
- Imported fonts
- Embedded workbook data
- Comments and references
- Components
- Checkpoints
- Preferences
- Personal asset libraries

This information belongs to the browser profile on the current device.

## What can remove local data

Local data can be lost through:

- Clearing site data
- Private-browsing session closure
- Browser profile deletion
- Browser uninstall
- Aggressive cleanup software
- Device reset
- Storage eviction
- Hardware failure

Download `.figureloom` backups regularly.

## Offline shell

FigureLoom registers an offline application shell. After the required files have loaded and been cached, much of the editor can reopen without a network connection.

Features that load outside libraries, authentication, cloud projects, collaboration, or optional providers still need network access.

## Working offline

Before going offline:

1. Open FigureLoom while connected.
2. Let the editor finish loading.
3. Open any outside libraries you expect to use.
4. Download a project backup.
5. Test a reload if the work is critical.

While offline:

- Local editing can continue.
- Local autosave can continue.
- Cloud saves and collaboration cannot synchronize.
- Outside assets that were not cached may not load.

After reconnecting, review the project before saving a cloud update.

## Browser permissions

FigureLoom can use browser capabilities such as:

- File selection
- Downloads
- Clipboard
- Local storage
- IndexedDB
- Service workers
- Authentication redirects

The browser may ask for permission or block an action. Use the browser's site settings to review permissions.

## Public client configuration

A hosted FigureLoom deployment can include a public Supabase URL and publishable key in browser code.

A publishable key is intended for client use. Security depends on Row Level Security, database policies, authenticated functions, and careful schema design.

Never place these in client code:

- Service-role key
- Database password
- SMTP credentials
- Private encryption master key
- Personal access tokens
- Provider secrets

## Cloud encryption

Cloud project payloads and persistent collaboration comment bodies are encrypted in the browser before storage.

Authorized users receive a stable project-specific key after the server verifies project membership.

This is application-layer encryption, not zero-knowledge encryption. Privileged infrastructure operators can derive keys.

## Cloud metadata

The service needs visible metadata for project lists and permissions.

Metadata can include:

- Project title
- Owner
- Timestamps
- Role
- Revision number
- Membership
- Invitation state
- Share-link records

Do not put confidential information in a project title.

## Shared projects

A shared project can be accessed by authorized members according to role.

Remember:

- An authorized user can view the project.
- Editors can change and export content.
- Reviewers can comment.
- A recipient may keep exported files or backups.
- Removing access does not delete files already downloaded by the recipient.

## Share links

Share links contain a raw invitation token in the URL. The service stores a hash of the token.

Send links through an appropriate channel, choose the smallest necessary role, use an expiry, and revoke links that are no longer needed.

## Sensitive information

Do not use a public or unapproved deployment for restricted information.

Examples include:

- Patient identifiers
- Protected health information
- Unpublished personal data
- Passwords or API keys
- Export-controlled material
- Confidential commercial information
- Restricted location data

An institution may require a formal security review before FigureLoom can be used with sensitive data.

## Uploaded files

Local uploads remain in browser storage unless included in a cloud project or shared output.

Check image metadata and filenames before sharing. A figure can reveal information through text, comments, file names, references, or embedded data even when the visible page looks harmless.

## Loomy and optional providers

The deterministic helper can operate without sending a prompt to a FigureLoom server.

Optional providers have their own privacy terms and processing behavior. Do not send sensitive prompts without understanding the selected provider.

## External asset libraries

Searching an outside library can request public asset metadata or files from that source. The request can reveal the browser IP address and requested resource to the asset host.

Use built-in or already cached artwork when an offline or isolated workflow is required.

## Downloads

Downloaded files leave browser storage and follow the device's file-handling rules.

Protect project backups because they can contain the complete editable project, including hidden content and embedded data.

## Deleting a local project

Before deletion:

1. Download a backup.
2. Confirm the file exists.
3. Import it into a temporary project if verification is important.
4. Delete the local project.

## Deleting a cloud project

Cloud deletion behavior depends on the deployed project controls and database policies.

Before deletion, download an archive and confirm whether collaboration comments, memberships, invitations, and links are also removed.

## Browser extensions

Extensions can read or modify web pages according to their permissions. Use a trusted browser profile for confidential work.

## Public computers

Avoid signing in or opening confidential projects on a shared computer.

If unavoidable:

- Use a private browser window only when the workflow is approved.
- Do not save passwords.
- Sign out.
- Close all tabs.
- Remove downloaded files.
- Remember that local storage and browser history can still be managed by the computer owner.

## Security checklist for users

- Keep the browser updated.
- Use a strong unique password.
- Protect the email account used for recovery.
- Review project roles.
- Revoke old links.
- Download backups.
- Avoid sensitive project titles.
- Inspect exports before sharing.
- Do not paste secrets into code windows or prompts.

## Security checklist for administrators

- Keep Row Level Security enabled.
- Test every role separately.
- Keep public Realtime access disabled.
- Protect private keys and database backups.
- Configure authentication redirects correctly.
- Configure reliable email delivery.
- Monitor rate limits.
- Review dependency and schema changes.
- Run security and performance advisors.
- Define retention, account deletion, incident, and breach procedures.

See [Self-hosting and deployment](Self-Hosting-and-Deployment).