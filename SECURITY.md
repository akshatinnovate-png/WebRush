# Security

## Posture

The site is static and has no backend, no database, no authentication and no user accounts.
There is nothing to breach server-side.

## Controls

`netlify.toml` sets:

- **Content-Security-Policy** — `script-src 'self'`, `object-src 'none'`, `form-action 'none'`,
  `base-uri 'self'`, `frame-ancestors 'self'`. No inline event handlers anywhere; self-hosting
  the fonts removed the last two external origins from the policy.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — geolocation, microphone, camera and FLoC all denied.

## Input handling

The only free-text input is the search palette. Its value is used solely as a
`String.prototype.includes` needle against already-loaded data and is rendered as a React text
child. There is no `dangerouslySetInnerHTML`, no `eval`, no `new Function`, and no template
injection anywhere in the codebase.

## Dependencies

Two runtime dependencies: `react` and `react-dom`. A smaller surface than any audit can find
fault with. Build tooling is dev-only and never ships.

## Reporting

Open an issue, or email akshat.innovate@gmail.com.
