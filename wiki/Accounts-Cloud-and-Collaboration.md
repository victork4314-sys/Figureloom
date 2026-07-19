# Accounts, cloud projects, and collaboration

An account is optional. The local editor, local gallery, autosave, project backups, imports, and exports work without signing in.

Accounts add encrypted cloud projects and collaboration features.

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

A protected database function verifies membership and provides a stable project-specific key to an authorized signed-in user.

This is application-layer encryption, not a zero-knowledge system. A privileged database operator can derive project keys. Protect database credentials and backups.

## Visible cloud metadata

The gallery needs some unencrypted metadata to function.

This can include:

- Title
- Owner
- Timestamps
- Role
- Revision number
- Membership and invitation records

Cloud gallery thumbnails are not required for the encrypted project gallery.

## Roles

| Role | Open project | Presence and cursors | Comment | Edit and broadcast | Manage access |
|---|---:|---:|---:|---:|---:|
| Viewer | Yes | Yes | No | No | No |
| Reviewer | Yes | Yes | Yes | No | No |
| Editor | Yes | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes | Yes |

## Inviting by email

The owner can enter a collaborator's email address and choose a role.

- If the account already exists, access can be added immediately.
- If the account does not exist, the invitation can remain pending for that email.
- When the exact email creates an account, access can activate automatically.

The project invitation system reserves access. The owner may still need to send the FigureLoom link to the collaborator separately.

## Sharing by secure link

An owner can create an expiring link for a viewer, reviewer, or editor.

Link behavior includes:

- The recipient signs in before access is granted.
- The raw token appears in the generated URL.
- The service stores a hash of the token rather than the raw token.
- Links can expire after a chosen period.
- Owners can revoke active project links.
- Accepting a link does not reduce an existing stronger role.

Treat a share link like an invitation. Send it through an appropriate channel and revoke it when it is no longer needed.

## Presence and remote cursors

Project members can see named presence and remote cursors in an active shared project.

Presence shows who is connected. A remote cursor shows another member's current location in the project.

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
2. Owner invites members with the smallest role they need.
3. Each person downloads a local backup before a major session.
4. Editors avoid making unrelated large changes at the same time.
5. Reviewers use comments instead of editing when possible.
6. The owner creates checkpoints before accepting large revisions.
7. The team resolves conflicts deliberately.
8. The owner exports and archives the final project.

## Removing access

Owners manage project membership and share links.

After removing access:

- Confirm the member no longer appears in the project.
- Revoke active share links if necessary.
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

## Privacy notes

Do not put secrets, patient identifiers, or restricted data into a shared project unless the deployment and workflow have been approved for that information.

Encryption protects stored payloads from ordinary exposure, but collaboration still involves accounts, metadata, browser sessions, and authorized users.

See [Privacy, security, and offline use](Privacy-Security-and-Offline-Use).

## Deployment details

Administrators should read [Self-hosting and deployment](Self-Hosting-and-Deployment) and the repository's cloud setup document before enabling accounts publicly.