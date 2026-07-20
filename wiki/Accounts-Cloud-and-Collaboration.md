# Accounts, cloud projects, and collaboration

An account is optional. The local editor, local gallery, autosave, project backups, imports, and exports work without signing in.

Accounts add encrypted cloud projects, account invitations, hosted MCP, and collaboration controls. Guest links allow another person to join a shared project without creating an email account.

## Creating an account

FigureLoom uses email and password authentication.

A typical sign-up flow is:

1. Open Account.
2. Choose Create account.
3. Enter an email address and password.
4. Submit the form.
5. Open the confirmation email.
6. Return to FigureLoom and sign in.

If the email does not arrive, use the confirmation resend action and check spam or filtered folders.

## Signing in

Open Account and enter the confirmed email address and password.

The signed-in profile can show initials or a selected scientific symbol.

## Password recovery

Choose Forgot password and enter the account email.

Open the recovery link in the email. FigureLoom detects the recovery session and shows the new-password form.

If the link opens the wrong deployment or does not return to the app, the deployment's authentication redirect settings may be incorrect.

## Local gallery without an account

The local gallery remains available while signed out.

Signing in does not automatically upload every local project. A cloud copy is created only through an explicit cloud save action.

## Cloud gallery

The cloud gallery contains projects owned by or shared with the account.

It can show metadata such as:

- Project title
- Owner
- Last update
- Role
- Revision information

Editable project contents are encrypted in the browser before storage.

## Saving a cloud project

1. Open the local project.
2. Sign in.
3. Open Projects or the cloud gallery.
4. Choose the cloud save or update action.
5. Wait for confirmation.
6. Check that the project appears in the cloud gallery.

Keep a downloaded `.figureloom` backup as a separate copy.

## Encryption model

The editable project payload and persistent collaboration comment bodies are encrypted with AES-GCM in the browser before storage.

A protected database function verifies membership and provides a stable project-specific key to an authorized signed-in or accepted guest session.

This is application-layer encryption, not a zero-knowledge system. A privileged database operator can derive project keys. Protect database credentials and backups.

## Visible cloud metadata

The gallery and access system need some unencrypted metadata to function.

This can include:

- Title
- Owner
- Timestamps
- Role
- Revision number
- Membership, invitation, guest-link, and connection records

## Roles

| Role | Open project | Presence and cursors | Comment | Edit and broadcast | Manage access |
|---|---:|---:|---:|---:|---:|
| Viewer | Yes | Yes | No | No | No |
| Reviewer | Yes | Yes | Yes | No | No |
| Editor | Yes | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes | Yes |

## Inviting an account by email

The owner can enter a person's email address and choose a role.

- If the account already exists, access can be added immediately.
- If the account does not exist, the invitation can remain pending for that email.
- When the exact email creates an account, access can activate automatically.

Email invitations are for people who will use a normal FigureLoom account.

## Sharing with a guest link

A guest link is different from an email invitation.

The owner must:

1. Sign in.
2. Save or open the project as a cloud project.
3. Open Share or Live Collaboration.
4. Choose the guest role and expiry.
5. Add an optional numeric PIN containing 4 to 12 digits.
6. Press **Create link**.
7. Send the generated link and, when used, the PIN through an appropriate channel.

The recipient opens the link and enters a display name. No email account or password is required for the guest join flow.

The deployment creates a temporary guest session, checks the link and optional PIN, grants the selected project role, and opens the encrypted project.

## Guest-link safety

The raw share token appears in the generated URL. The service stores a hash of the token rather than the raw token.

- Treat the URL like an invitation credential.
- Do not post it publicly.
- Send the PIN separately when extra protection matters.
- Use the smallest role needed.
- Choose a short expiry for temporary work.
- Revoke links that are no longer needed.

Accepting a guest link does not reduce a stronger role that the same session already has.

## Revoking guest links

The owner can revoke active guest links from the collaboration controls.

Revocation stops future use of those links. It does not remotely delete project backups or exports that were already downloaded.

## Presence and remote cursors

Accepted project members and guests can see named presence and remote cursors in an active shared project according to the deployment and role permissions.

Presence shows who is connected. A remote cursor shows another participant's current location in the project.

## Live editing

Owners and editors can send encrypted project updates.

Incoming updates pause while the local user is typing or dragging. The local user then chooses:

- Apply remote update
- Keep mine

This prevents a remote update from silently replacing active local work.

## Collaboration comments

Reviewers, editors, and owners can use persistent comments according to role permissions.

Comment bodies are encrypted before storage. Comment metadata still needs enough information for access control and synchronization.

## Working with several people

A safe collaboration routine is:

1. Owner saves the first cloud copy.
2. Owner grants the smallest role each person needs.
3. Each editor downloads a local backup before a major session.
4. Editors avoid making unrelated large changes at the same time.
5. Reviewers use comments instead of editing when possible.
6. The owner creates checkpoints before accepting large revisions.
7. The group resolves conflicts deliberately.
8. The owner exports and archives the final project.

## Removing access

Owners manage project membership, email invitations, and guest links.

After removing access:

- Confirm the member or guest no longer appears in the project.
- Revoke active guest links if necessary.
- Remember that previously downloaded exports or project backups cannot be remotely deleted.

## Profile picture choices

The profile button can use initials or a scientific symbol such as DNA, flask, molecule, cell, signal, or marker.

This affects the FigureLoom interface only. It is not added to project artwork or exports.

## Cloud connection problems

If cloud features are unavailable:

- Local projects continue working.
- Autosave continues locally.
- Project backups can still be downloaded and imported.
- The local gallery remains available.
- Cloud controls should report the connection problem rather than replacing local data.

Do not repeatedly press cloud save during an outage. Download a `.figureloom` backup and retry when the service is available.

## Guest link says access is not enabled

The deployment must allow anonymous authentication for temporary guest sessions and must include the guest-link database functions and policies.

The owner can still invite an ordinary email account when guest access is unavailable.

## Privacy notes

Do not put secrets, patient identifiers, or restricted data into a shared project unless the deployment and workflow have been approved for that information.

Encryption protects stored payloads from ordinary exposure, but collaboration still involves accounts or temporary guest sessions, metadata, browser sessions, and authorized users.

See [Privacy, security, and offline use](Privacy-Security-and-Offline-Use).

## Deployment details

Administrators should read [Self-hosting and deployment](Self-Hosting-and-Deployment) and the repository's cloud setup document before enabling accounts, guest links, collaboration, or hosted MCP publicly.
