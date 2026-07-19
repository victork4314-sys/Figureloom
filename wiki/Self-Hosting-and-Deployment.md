# Self-hosting and deployment

FigureLoom is a static browser application. The basic local editor can be served without a build step. Accounts, cloud projects, and collaboration require a configured Supabase project.

## Basic local server

From the repository root:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/
```

Do not open `index.html` directly as a local file. Browser storage, modules, service workers, and fetch behavior are more reliable through an HTTP server.

## Static hosting

The basic app can be deployed to static hosting such as:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel static hosting
- An ordinary web server

The host must serve the repository files with correct content types and allow the service worker at the site path.

## Custom domain

Point the domain to the static host according to that provider's instructions.

After changing domains:

- Update authentication Site URL.
- Update redirect allow lists.
- Check canonical and social metadata.
- Check the manifest start URL.
- Check service-worker scope.
- Test downloads.
- Test account confirmation and recovery links.
- Test share links.

## HTTPS

Use HTTPS in production.

Secure contexts are required or strongly preferred for service workers, clipboard features, authentication, and modern browser APIs.

## Cloud configuration

The browser receives only the public Supabase project URL and publishable key.

A client configuration follows this general shape:

```js
window.FIGURELOOM_CLOUD_CONFIG = {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-publishable-key',
  redirectUrl: `${window.location.origin}${window.location.pathname}`,
  appName: 'FigureLoom'
};
```

The deployed repository may retain older internal variable names for compatibility. User-facing branding should remain FigureLoom.

## Never expose secrets

Do not put these in browser code or the repository:

- Supabase service-role key
- Database password
- SMTP password
- Private encryption master key
- Provider secret keys
- Personal access tokens

The publishable key is not a secret. Security depends on database policies and authenticated functions.

## Database schema

The repository contains Supabase SQL for:

- Profiles
- Projects
- Project members
- Pending invitations
- Share links
- Collaboration comments
- Project roles and access helpers
- Project-key derivation
- Row Level Security
- Private Realtime authorization

Apply the schema and later migrations in the documented order.

## Row Level Security

Every exposed application table should have Row Level Security enabled.

Test each role separately:

- Signed out
- Viewer
- Reviewer
- Editor
- Owner

A successful user-interface test does not prove that database policies are safe. Test direct API behavior as well.

## Encryption master key

The project-key derivation system depends on a random server-side master key stored outside exposed schemas.

Back it up with the database. Losing it can make encrypted project payloads unrecoverable.

Do not send it to the browser or store it in public SQL.

## Authentication configuration

In Supabase Authentication URL configuration:

- Set the production Site URL.
- Add the production redirect URL.
- Add local development URLs that are actually used.
- Remove obsolete redirects.

Test:

1. Account creation
2. Confirmation email
3. Confirmation resend
4. Sign-in
5. Forgot-password email
6. Recovery link
7. New password
8. Sign-out

## Email delivery

Built-in test email delivery is limited. Configure a reliable SMTP sender before public use.

Check sender domain authentication and delivery to several providers.

Do not place SMTP credentials in browser code.

## Realtime

Private Realtime channels support presence, cursors, and encrypted edit broadcasts.

Keep public Realtime channel access disabled.

Test:

- Two members in the same project
- A non-member attempting access
- Viewer and reviewer restrictions
- Editor broadcasts
- Owner access management
- Incoming update pause while typing or dragging

## Share links

The database should store only a hash of each raw share token.

Test:

- Viewer link
- Reviewer link
- Editor link
- Expiry
- Revocation
- Existing stronger membership
- Signed-out recipient
- Non-member recipient after sign-in

## Invitations by email

Test both existing accounts and unknown email addresses.

Pending invitations should activate only for the exact authenticated email.

## Service worker and cache

FigureLoom uses a versioned service-worker cache.

When changing runtime files:

- Bump the stable build identifier.
- Add new essential files to the cache list.
- Remove obsolete cache names through activation cleanup.
- Test a clean install.
- Test an update from the previous build.
- Test offline reopening.

A changed source file without a cache bump can leave phones or installed web apps on an older version.

## Content Security Policy

A deployment can add a Content Security Policy, but it must allow the resources FigureLoom actually uses.

Review:

- Supabase endpoints
- Realtime WebSocket connection
- On-demand libraries
- MathJax
- Public scientific asset hosts
- Blob and data URLs needed for local export
- Worker and service-worker requirements

Start in report-only mode and test every major feature before enforcing a strict policy.

## Outside libraries

Scientific artwork, MathJax, and optional providers can load from outside services.

For a controlled or offline deployment:

- Host required libraries yourself where licensing permits.
- Remove optional providers.
- Precache essential assets.
- Test with the network disabled.

## Custom provider configuration

Loomy can expose optional providers depending on the deployment.

Do not embed provider secrets in a public static app. Use browser-safe provider methods, user-supplied credentials, an approved backend, or disable the provider.

## Backups

Enable database backups before public use.

Back up:

- Database
- Private encryption master key
- Authentication configuration records
- SQL migrations
- Static deployment
- Custom domain configuration
- SMTP configuration outside the repository

Test restoration, not only backup creation.

## Monitoring

Monitor:

- Authentication failures
- Email delivery
- Database errors
- RLS denials
- Realtime connection failures
- Storage and row growth
- Rate limits
- Client-side error reports

Do not log decrypted project contents.

## Production checklist

- HTTPS enabled
- Correct domain and redirects
- Email confirmed working
- RLS tested by role
- Share links tested
- Private Realtime tested
- Database backups enabled
- Encryption key backed up
- Service-worker update tested
- Offline shell tested
- Export downloads tested
- Privacy and retention policy written
- Account deletion process defined
- Incident response defined
- Dependency and database advisors reviewed

## Publishing the wiki

The repository stores the wiki source in `wiki/`. A GitHub Actions workflow validates internal links and publishes the Markdown pages to the repository wiki after changes reach `main`.

This keeps the manual reviewable in pull requests and prevents the wiki from becoming an undocumented second source tree.