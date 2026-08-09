# privacytracker docs

Public-facing documentation site for [privacytracker](https://github.com/privacykey/privacytracker), built with [Mintlify](https://mintlify.com).

## Audience split

The site is organised around two distinct readers, with a third tab for the API:

- **Self-Host** tab — the default. For people installing and running privacytracker on their own machine via the signed desktop app, Homebrew cask, or Docker. No source checkout assumed.
- **Develop** tab — for people building from source, contributing, integrating against the API, or understanding the internals (architecture, feature flags, translations, the docs site itself).
- **API Reference** tab — interactive endpoint pages auto-generated from `api-reference/openapi.yaml`, plus a hand-written overview covering authentication, conventions, and rate-limiting.

Internal release engineering — code signing, notarization, the GitHub Actions that publish notarized builds — is intentionally **not** in this site. That stays in the project's `.github/wiki/` so it doesn't crowd out user-facing docs.

## Local development

```bash
# Check docs.json navigation, internal links, anchors, assets, and OpenAPI wiring
npm run check

# Run the live preview from the docs root (where docs.json lives)
npm run dev
```

Open <http://localhost:3000>. The preview hot-reloads as you edit MDX files.

`npm run check` uses only Node built-ins, so it works without installing the Mintlify CLI first. `npm run dev` launches Mintlify through `npx`.

## Project layout

```
privacytracker-docs/
├── docs.json                          Mintlify site config (theme, navigation, OpenAPI wiring)
├── package.json                       Local docs scripts (check, dev, sync-changelog, linkcheck)
├── README.md                          (this file)
├── CONTRIBUTING.md                    How to propose and structure doc changes
├── LICENSE                            Apache-2.0
├── .gitignore
├── scripts/
│   ├── check-docs.mjs                 Local smoke check for navigation, internal links, anchors, assets
│   └── sync-changelog.mjs             Pulls the main repo's CHANGELOG.md into changelog.mdx
│
├── introduction.mdx                   Self-Host · Get Started: landing page
├── alternatives.mdx                   Self-Host · Get Started: how privacytracker compares
├── quickstart.mdx                     Self-Host · Get Started: 5-minute install + first import
├── installation.mdx                   Self-Host · Get Started: desktop / Homebrew / Docker
├── configuration.mdx                  Self-Host · Get Started: settings, AI providers, env vars
├── cookbook.mdx                       Self-Host · Recipes: task-oriented walkthroughs
├── performance-and-sizing.mdx         Self-Host · Operate: resource use and scaling
├── backup-and-restore.mdx             Self-Host · Operate: backup, restore, migrate between install paths
├── security.mdx                       Self-Host · Operate: data posture, audit bundles, threat model
├── hardening.mdx                      Self-Host · Operate: locking down a self-hosted deployment
├── upgrading.mdx                      Self-Host · Operate: upgrading across versions
├── troubleshooting.mdx                Self-Host · Operate: common issues with diagnostics + fixes
├── faq.mdx                            Self-Host · Help: common questions
├── glossary.mdx                       Self-Host · Help: domain terms used across the app
├── changelog.mdx                      Self-Host · Help: mirror of main repo's CHANGELOG.md
├── about-these-docs.mdx               Self-Host · Help: how these docs are written and maintained
│
├── develop/
│   ├── overview.mdx                   Develop: who this section is for
│   ├── build-from-source.mdx          Develop: clone + npm install + run / test / build
│   ├── scripts.mdx                    Develop: the repo's helper scripts
│   ├── contributing.mdx               Develop: PR workflow, what makes a good change
│   ├── architecture.mdx               Develop: codebase + data flow + Mermaid diagrams
│   ├── feature-flags.mdx              Develop: focus model + per-flag override
│   ├── tauri.mdx                      Develop: the desktop shell, packaging, and updater
│   ├── translations.mdx               Develop: Crowdin + next-intl workflow (the app)
│   ├── translating-the-docs.mdx       Develop: how to add a language to this docs site
│   └── versioning.mdx                 Develop: how this docs site is versioned
│
├── api-reference/
│   ├── introduction.mdx               API: hand-written overview (auth, CSRF, conventions)
│   └── openapi.yaml                   OpenAPI 3.1 spec — Mintlify auto-generates one page per operation
│
├── images/                            Screenshots, diagrams (favicon.svg lives here)
│   ├── SCREENSHOTS.md                 Capture guide: what shots are needed and where they go
│   ├── favicon.svg
│   └── screenshot-placeholder.svg     Fallback placeholder for future new pages
├── logo/                              light.svg + dark.svg used by docs.json
├── essentials/                        Reserved (empty for now)
├── snippets/                          Reusable MDX fragments (empty for now)
│
└── .github/workflows/
    ├── linkcheck.yml                  lychee link-check on every PR + weekly cron
    └── sync-changelog.yml             Syncs changelog.mdx from the main repo's CHANGELOG.md
```

## Editing

- Pages are MDX (Markdown + JSX). Mintlify components like `<Card>`, `<Steps>`, `<Tabs>`, `<Accordion>`, `<CodeGroup>`, and `<Frame>` are available out of the box — see [Mintlify components](https://mintlify.com/docs/components).
- After adding a new page, register it under `navigation.tabs[*].groups[*].pages` in `docs.json`. Pages not listed there are reachable by URL but absent from the sidebar.
- Internal links use the page slug without `.mdx` (e.g. `/develop/architecture`).
- Run `npm run check` before opening a PR; it catches missing sidebar pages, broken internal links, missing anchors, missing assets, and a missing / malformed OpenAPI file.
- Keep self-hoster pages free of `lib/*` filenames and code-internal jargon. If a page assumes a source checkout, it belongs under `develop/`.
- Architecture diagrams use Mintlify's native Mermaid support — fenced \`\`\`mermaid blocks render as SVG.
- The API Reference's per-endpoint pages are auto-generated from `api-reference/openapi.yaml`. Edit the spec, not the pages — they're regenerated on every build.

## CI

The `linkcheck.yml` workflow runs the local smoke check first, then [lychee](https://github.com/lycheeverse/lychee-action) on every PR that touches MDX/MD/`docs.json`/`package.json`/`scripts/**`/`openapi.yaml`, and on a weekly cron to catch external-link rot. Failed scheduled runs auto-open an issue. Cache key: `cache-lychee-<sha>`; first run is slow, subsequent runs hit the cache.

To run locally:

```bash
# Once: install lychee
brew install lychee

# Then, from the docs root:
npm run check
npm run linkcheck
```

## Deploying to Mintlify hosting

1. Push this repo to GitHub (it lives standalone, separate from the main `privacytracker` codebase).
2. Sign in at <https://dashboard.mintlify.com> with your GitHub account.
3. Click **Add deployment** → select this repo → confirm `docs.json` as the config root.
4. Mintlify auto-deploys to `<your-subdomain>.mintlify.app` and rebuilds on every push to `main`.
5. Optional: under **Settings → Custom domain**, point a CNAME at `cname.mintlify.app` to host the docs at e.g. `docs.privacytracker.privacykey.org`.
6. Optional: install the Mintlify GitHub App so PRs get a preview-link comment with rendered changes inline.

The docs are intentionally decoupled from the main repo's wiki so hosting can move (Mintlify → Vercel → self-hosted) without rewriting the source.

## Adding a language

The docs site is English-only today; the framework is in place to add others. See [Translating the docs](https://docs.privacytracker.privacykey.org/develop/translating-the-docs) (or `develop/translating-the-docs.mdx` if you're previewing locally) for the step-by-step.

## Capturing screenshots

The required screenshot set lives in `images/`. The capture guide is at [`images/SCREENSHOTS.md`](./images/SCREENSHOTS.md) — it lists every filename, where to capture it from in the running app, and which doc pages reference it.

## License

Documentation content is licensed under [Apache-2.0](LICENSE), matching the main privacytracker project.
