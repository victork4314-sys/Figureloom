# SciCanvas cloud, accounts and collaboration setup

SciCanvas remains fully local when `cloud-config.js` contains empty values. The cloud modules activate after a Supabase project is configured.

## What the cloud package provides

- Email/password registration and sign-in
- Password recovery by email and in-app password replacement after the recovery redirect
- Sign in with Apple
- Sign in with Microsoft / Azure
- A local project gallery that works without accounts
- An account gallery of owned and shared projects
- Application-layer AES-GCM encryption of project payloads
- Row-level database access policies
- Shared projects with owner, editor, reviewer and viewer roles
- Private authenticated realtime project updates, presence and remote cursors
- Encrypted persistent review comments
- Email invitations for new or existing collaborators

The server stores project titles and optional SVG thumbnails as gallery metadata. The editable project payload and review-comment bodies are encrypted before storage. Project keys are derived inside an authenticated Edge Function from a server-only master secret and the project ID.

This is not a zero-knowledge design: an operator with the Edge Function secret can derive project keys. It protects stored payloads, isolates projects by account and preserves ordinary password recovery and OAuth usability. A later KMS or user-controlled recovery-key design can replace the key function without changing the project table format.

## 1. Create and link a Supabase project

Install the Supabase CLI, sign in and link the repository to the project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

## 2. Create the database schema

Run [`../supabase/schema.sql`](../supabase/schema.sql) in the Supabase SQL editor.

The script creates:

- `profiles`
- `projects`
- `project_members`
- `collaboration_comments`
- access helper functions
- Row Level Security policies
- private Realtime Broadcast/Presence authorization policies
- the Realtime publication for collaboration comments

Keep **Allow public access** disabled in Supabase Realtime settings. The client opens channels with `private: true`; public channels are not part of the collaboration design.

## 3. Configure Edge Function secrets

Generate a long random vault secret. Do not commit it.

```bash
openssl rand -base64 48
supabase secrets set VAULT_MASTER_SECRET='PASTE_THE_RANDOM_VALUE'
supabase secrets set SITE_URL='https://YOUR_GITHUB_PAGES_OR_CUSTOM_DOMAIN/'
```

Supabase provides `SUPABASE_URL` and server credentials to hosted Edge Functions. The functions accept the modern `SUPABASE_SECRET_KEY`, the legacy `SUPABASE_SERVICE_ROLE_KEY`, or the platform-provided `SUPABASE_SECRET_KEYS` map. Never place any server secret in `cloud-config.js` or another browser file.

Changing `VAULT_MASTER_SECRET` makes existing encrypted project payloads unreadable unless they are migrated with the old key, so store and back it up as a production secret.

## 4. Deploy the functions

```bash
supabase functions deploy project-key
supabase functions deploy invite-member
```

The functions are located at:

- `supabase/functions/project-key/index.ts`
- `supabase/functions/invite-member/index.ts`

## 5. Configure browser-safe project values

Edit [`../cloud-config.js`](../cloud-config.js):

```js
window.SCICANVAS_CLOUD_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY',
  redirectUrl: 'https://YOUR_DOMAIN/',
  appName: 'SciCanvas'
};
```

The public anon/publishable key is intended for browser use when Row Level Security is enabled. Never put a service-role or secret key in this file.

Add the production URL and local development URLs to the Supabase Auth redirect allow list.

## 6. Email and password recovery

Enable Email authentication in Supabase Auth. Configure the site URL, redirect allow list, custom SMTP sender and email templates.

SciCanvas calls `resetPasswordForEmail()` with `redirectUrl`. When the user returns through the recovery link, the account panel detects the `PASSWORD_RECOVERY` event and displays a new-password form that calls `updateUser({ password })`.

Test signup, confirmation, sign-in, password reset and password replacement using a non-admin test account before launch.

## 7. Sign in with Apple

In Apple Developer:

1. Create or choose an App ID and enable Sign in with Apple.
2. Create a Services ID for the website.
3. Add the site domain and the Supabase callback URL shown in the Supabase Apple provider settings.
4. Create the signing key and client secret required by Apple.
5. Enable Apple in Supabase Auth and enter the Services ID/client ID and secret.

Apple web OAuth client secrets expire and must be rotated on Apple’s schedule. Keep the signing key secure and set a maintenance reminder.

The client already calls:

```js
supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo } })
```

Apple may not provide a full name through the web OAuth flow, so SciCanvas keeps its separate editable display-name onboarding.

## 8. Sign in with Microsoft / Azure

In Microsoft Entra ID:

1. Register a web application.
2. Add the Supabase callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. Create a client secret.
4. Enable Azure in Supabase Auth and enter the application/client ID, secret and appropriate tenant URL.
5. Choose the supported account types required by the deployment.

The client uses the Supabase provider name `azure` and requests email, OpenID and profile scopes.

## 9. Private Realtime authorization

SciCanvas uses two private authenticated topics per project:

- `project-room:<project UUID>` for presence and cursors. Any project member may join and send room events.
- `project-edit:<project UUID>` for encrypted document broadcasts. All members may receive updates, but only owners and editors may send them.

The SQL schema authorizes `realtime.messages` by extracting the project UUID from the topic and checking `project_role()` / `can_access_project()`. The client refreshes Realtime authentication before subscribing.

Persistent encrypted comments use Postgres Changes on `collaboration_comments`:

- viewers can read
- reviewers can create comments
- authors or editors can update/delete comments

Review these policies with four separate test accounts before production.

## 10. Invitation email behavior

`invite-member` checks that the caller owns the project. It then:

- finds an existing Auth user by email, or
- sends a Supabase invitation email to create the account,
- creates or updates the project membership and role.

Configure Auth email templates and production SMTP before inviting real collaborators.

## 11. Production checklist

- Use a custom SMTP sender and test delivery, confirmation and recovery links.
- Configure Apple and Microsoft provider secrets and redirect URLs.
- Store `VAULT_MASTER_SECRET` in the platform secret manager and back it up securely.
- Keep all server/secret keys out of browser assets and logs.
- Disable public Realtime channels and verify private authorization policies.
- Review RLS policies with separate owner/editor/reviewer/viewer test accounts.
- Test a shared project simultaneously in two browsers.
- Configure rate limits and abuse monitoring for Auth and Edge Functions.
- Add database backups and a key-migration procedure before rotating the vault secret.
- Publish privacy, retention, account-deletion and breach-response policies appropriate for the deployment.
