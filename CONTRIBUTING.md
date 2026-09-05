# Contributing to the privacytracker docs

Thanks for helping make the docs better. This file is for **contributing to the docs site itself**. If you're looking for how to contribute to the privacytracker app, see [Contributing](https://docs.privacytracker.privacykey.org/develop/contributing) inside the docs (or `develop/contributing.mdx` in this repo if you're previewing locally) — that's a different workflow with different tests.

## Quick start

```bash
# 1. Fork github.com/privacykey/docs-privacytracker and clone your fork
git clone git@github.com:<your-username>/docs-privacytracker.git
cd docs-privacytracker

# 2. Run the smoke check to confirm a clean baseline
npm run check

# 3. Live preview while you edit (Mintlify CLI via npx — first run downloads it)
npm run dev      # → http://localhost:3000

# 4. Branch + edit + check + commit + push + PR
git checkout -b docs/<short-description>
# … edit MDX …
npm run llms
npm run check
git commit -am "docs: <what you changed>"
git push origin HEAD
gh pr create
```

`npm run check` uses only Node built-ins, so it works without installing anything beyond the repo's own dependencies. Run it before every push — CI runs the same script and a failed check blocks merge.

## What goes where

The site has three audience-shaped surfaces. Putting a page in the wrong one is the single most common mistake.

| Audience | Lives under | Assumes | Do put | Don't put |
|---|---|---|---|---|
| **Self-hoster** | top-level `*.mdx` | a prebuilt install (desktop / Homebrew / Docker), no source checkout | install paths, configuration, backup, troubleshooting, FAQ, security | anything mentioning `lib/*`, code internals, build commands |
| **Developer** | `develop/*.mdx` | a source checkout, Node 24, willingness to read code | architecture, feature flags, build/test commands, code-style notes | end-user setup steps |
| **API integrator** | `api-reference/*` | calling the HTTP API from another tool | auth conventions, endpoint reference (auto-generated from `openapi.yaml`) | SDK code (we don't ship one) |

If you're tempted to write a page that crosses the boundary, split it. Cross-link instead of duplicating.

## Authoring workflow

### Creating a new page

1. Decide which tab + group it belongs in (see the table above).
2. Create the MDX file at the right path. Filename is lowercase with hyphens (`backup-and-restore.mdx`, not `BackupAndRestore.mdx` or `backup_and_restore.mdx`).
3. Add the page slug to `docs.json` under `navigation.tabs[*].groups[*].pages`. Slugs don't include `.mdx`.
4. Run `npm run check`. If you forget step 3, the check will warn that the page isn't listed in the sidebar.
5. Run `npm run dev` to preview.

Pages not registered in `docs.json` are still reachable by URL but won't appear in the sidebar — useful for redirect targets and not much else.

### Frontmatter

Every page starts with:

```mdx
---
title: Short, sentence-case page title
description: "One line — what's on this page and why someone would read it. Used for the sidebar tooltip and SEO description."
---
```

Title and description should make sense out of context (e.g. in search results) — don't write *Overview* as a title; write *Architecture overview*.

### Internal links

```mdx
See [Troubleshooting → Reverse-proxy CSRF rejection](/troubleshooting#reverse-proxy-csrf-rejection).
```

- Use absolute paths starting with `/`. Don't use relative paths.
- Don't include `.mdx`.
- Anchors are slugified from the section heading: lowercase, spaces → hyphens, special chars stripped. The smoke check verifies every anchor target exists.

### External links

Bare URLs render as live links automatically. For named links, use markdown:

```mdx
[lychee](https://github.com/lycheeverse/lychee-action)
```

The weekly cron in `.github/workflows/linkcheck.yml` catches external-link rot and opens an issue when something 404s.

### Code blocks

Always specify the language:

````mdx
```bash
curl http://localhost:3000/api/health
```
````

For multi-language examples, use `<CodeGroup>`:

````mdx
<CodeGroup>
```bash curl
curl http://localhost:3000/api/apps
```

```javascript fetch
const res = await fetch("http://localhost:3000/api/apps");
```
</CodeGroup>
````

The label after the language (`curl`, `fetch`) is what shows on the tab.

## Component vocabulary

When to reach for which Mintlify component:

| Component | Use it for | Don't use it for |
|---|---|---|
| `<Card>` / `<CardGroup>` | Linking to another page from a landing-style intro | Decoration without a link target |
| `<Steps>` | Strictly ordered tasks (do A *then* B *then* C) | A list of things where order doesn't matter |
| `<Tabs>` | Mutually exclusive paths (Mac vs. Linux vs. Windows) | A list of things you'd read sequentially |
| `<AccordionGroup>` / `<Accordion>` | Reference content where most readers only need one or two entries (FAQ, scope lists, advisories) | Step-by-step walkthroughs (use `<Steps>`) |
| `<CodeGroup>` | The same example in multiple languages | Different examples in the same language (use separate fenced blocks) |
| `<Note>` / `<Warning>` / `<Tip>` | Genuinely important callouts | Adding visual weight to ordinary prose |
| `<Frame>` | Wrapping screenshots | Wrapping random images |

When in doubt, use plain markdown. Components are powerful and easy to over-apply.

## Voice

Keep prose tight. A concrete house style:

- **Second person, present tense.** *"You set the admin token in the environment"*, not *"The admin token is set by the user"*.
- **Short paragraphs.** Three sentences is plenty; five is the upper limit.
- **Lists are for parallel things.** If your bullets vary in shape — a one-liner next to a five-line explanation next to a sub-list — turn it into prose.
- **Avoid filler.** *"It is important to note that"*, *"in order to"*, *"please be aware that"* all delete cleanly.
- **Don't apologise for the tool.** *"Unfortunately, this requires…"* erodes trust. State the requirement and move on.
- **Match the audience.** Self-hoster pages avoid `lib/*` filenames. Developer pages can name files freely. API pages talk in HTTP verbs and paths.

## Diagrams

Mintlify renders fenced ` ```mermaid ` blocks natively. Use them when ASCII art is straining — the data flow in `develop/architecture.mdx` is the canonical example.

For three nodes or fewer, prose is usually clearer than a diagram.

## Editing the changelog

**Don't edit `changelog.mdx` by hand.** It's regenerated automatically from the main repo's `CHANGELOG.md` by `.github/workflows/sync-changelog.yml`. The flow is:

1. Main repo cuts a release → `CHANGELOG.md` is updated by `release.yml`.
2. The docs site's daily cron fetches the upstream `CHANGELOG.md`.
3. `scripts/sync-changelog.mjs` converts it to MDX (adds frontmatter, fixes the H1, prepends the intro callout).
4. If the result differs from `changelog.mdx`, the workflow opens a PR titled `docs: sync CHANGELOG from main repo`.
5. A human reviewer skims the diff and merges.

To force a sync without waiting for the cron, run the workflow manually from the GitHub Actions UI (`workflow_dispatch`) or trigger it locally:

```bash
npm run sync-changelog
git diff changelog.mdx
```

If the script needs to change (e.g. an upstream `CHANGELOG.md` format change broke the conversion), edit `scripts/sync-changelog.mjs` and re-run.

If you really do need a docs-only edit to the changelog (rare — usually a typo in the source), make it in the main repo's `CHANGELOG.md` instead so the next sync doesn't clobber your fix.

## Editing the OpenAPI reference

The per-endpoint API pages are auto-generated from `api-reference/openapi.yaml`. To change one, edit the YAML — Mintlify regenerates the page on the next build. Things to keep in mind:

- New operations need a `tags` entry that's already declared in the top-level `tags` array, or they'll render under "Other".
- Schema names live in `components.schemas` and are referenced via `$ref`. Add a new schema there rather than inlining the same shape in multiple operations.
- `description` fields containing colon-space (`: `) need to be quoted: `description: "Returns 200 with: …"`.
- Field-level `example` values render in the playground; full request/response examples in `examples` blocks render alongside.

Run `npm run check` — it validates that the file parses as OpenAPI 3.x and contains a `paths:` section.

## Adding a screenshot

See [`images/SCREENSHOTS.md`](./images/SCREENSHOTS.md) for the full capture guide. Filenames, what to capture, and which page references each shot are listed there.

When you swap a placeholder for a real screenshot:

1. Drop the PNG into `images/` (compress with `pngquant --quality 80-95 --strip` first).
2. Edit the relevant MDX page to swap `/images/screenshot-placeholder.svg` for the new file.
3. Run `npm run check`.

## PR conventions

- **One concept per PR.** A typo fix and a structural reorganisation should be two PRs, not one. Smaller PRs review faster.
- **Branch names:** `docs/<short-description>` (e.g. `docs/security-page`, `docs/fix-troubleshooting-typo`).
- **Commit messages:** start with `docs:` for content, `chore:` for tooling, `fix:` for bug fixes in scripts. Keep the subject under 72 chars.
- **Run `npm run llms`, then `npm run check`, before pushing.** CI runs the same check; failing locally first saves a round trip.
- **Preview your changes.** `npm run dev` and click through every page you touched, plus any page that links to a section you renamed.

## Reviewing PRs

If you're reviewing someone else's docs PR, the checklist is:

- Does the page sit in the right tab + group? (See *What goes where* above.)
- Does it cross-link instead of duplicating? Existing pages should be referenced rather than re-written.
- Are anchors stable? Renaming a heading breaks every inbound link.
- Does it pass `npm run check`?
- Does the page render? Run `npm run dev` locally, or check the preview URL Workers Builds uploads for the branch once the repo is connected.

## Reporting issues vs. opening PRs

Bug reports are valuable on their own — you don't have to fix what you found.

- **Documentation bugs (typos, stale info, broken links the cron missed):** open an issue at [github.com/privacykey/docs-privacytracker/issues](https://github.com/privacykey/docs-privacytracker/issues) or click the *Suggest edits* link in the docs page footer (Mintlify renders this when feedback is enabled in `docs.json`).
- **App bugs:** open an issue at [github.com/privacykey/privacytracker/issues](https://github.com/privacykey/privacytracker/issues) instead — different repo.
- **Security findings:** never in a public issue. Use [GitHub Private Vulnerability Reporting](https://github.com/privacykey/privacytracker/security/advisories/new) on the main repo. The docs site's source rarely contains anything security-sensitive (it's all public copy), but if you find that the docs claim something about the app's security posture that isn't actually true, that's worth reporting privately so the fix to the app and the docs can land together.

## Code of conduct

Be kind. Critique writing, not writers. Maintainers may close issues or PRs that don't meet that bar — but the bar is just *treat people the way you'd want to be treated*. It's not high.
