# Contributing

Use Node.js 22.12+ and Bun 1.3+. Install dependencies with `bun install`.

Before proposing a change, run:

```bash
bun run typecheck
bun run test
bun run audit:public
bun run build
```

Keep pull requests focused. For interface changes, include before/after screenshots and the route you tested. For translations, preserve the meaning of feature and backend limitations in all README versions.

Use synthetic data in examples. Never include credentials, cookies, account exports, customer records, private media, or private repository history. Avoid adding a production API fallback to the demo transport. Actions that require a backend must remain explicit.

Report bugs with a route, reproduction steps, expected result and relevant browser errors. Remove personal data from screenshots and logs before posting. Do not post sensitive security reports in public issues; use GitHub's private vulnerability reporting if it is enabled for this repository.
