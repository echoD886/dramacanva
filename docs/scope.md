# What this release contains

This is an independent frontend snapshot with its own repository history. It is not a mirror of the private development repository.

Included: selected home, short-drama, canvas, skill, video-template, asset-library, toolbox, pricing, model and blog interfaces; their shared components and styles; public skill descriptions; selected published articles; frontend API types; a local demo transport.

Excluded: Product Studio and About pages, admin pages and admin API actions, backend source, provider credentials, production environment files, database dumps, account records, original media libraries, real showcase project exports, operational scripts, private issues, pull requests and prior commit history.

The logo was supplied for this release. The README cover was generated for it. The README screenshots in `docs/assets/screenshots/` were taken from the hosted product, with account details cropped out. Other artwork is represented by a local placeholder. Example showcase records are fictional, and empty library responses contain no user data.

## Runtime boundary

- The shared Axios client uses the local adapter in `src/demo/transport.ts` and does not use a configurable production API URL.
- Direct browser fetches are restricted to local resources; `/api/` requests receive demo responses or an explicit unsupported-operation error.
- The HTML Content Security Policy blocks external connections, external embedded media and form submissions.
- Telemetry entry points are no-ops. Browser storage uses a separate public-preview namespace where the original application had a product-specific namespace.
- Write requests are rejected. An empty list does not mean a cloud account has been queried. A local canvas edit does not mean a server has saved it.

Frontend API clients describe integration contracts; their presence does not supply a backend implementation. Changes that connect a backend must review all network paths, authentication, storage scope and the Content Security Policy together.

## Verification limits

Build, type and isolation checks are separate from browser verification. A successful build does not prove every editor workflow works without its original service. Generation, sign-in, billing, remote media processing and cloud persistence intentionally require further integration.
