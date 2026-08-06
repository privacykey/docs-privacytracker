# Screenshot capture guide

Where each screenshot should come from in the running app, what filename to use, and which docs page references it.

Capture against a clean install with [`POST /api/dev/seed-sample-data`](https://github.com/privacykey/privacytracker/blob/main/app/api/dev/seed-sample-data/route.ts) so every shot shows the same demo apps. Use a 1440×900 window; Mintlify renders images at retina densities so 2× source resolution is fine.

## Required shots

| Filename | Where in the app | Docs page that references it |
|---|---|---|
| `dashboard-overview.png` | `/dashboard` after seeding sample data | `introduction.mdx`, `quickstart.mdx` |
| `app-detail-timeline.png` | `/apps/<id>` for an app with at least 3 snapshots | `quickstart.mdx`, `introduction.mdx` |
| `settings-ai.png` | `/dashboard/settings#ai-summaries` | `configuration.mdx`, `quickstart.mdx` |
| `settings-backup.png` | `/dashboard/settings#backup` | `backup-and-restore.mdx` |
| `notification-bell-open.png` | bell with at least one resume notification visible | `troubleshooting.mdx`, `develop/architecture.mdx` |
| `taskcenter-resumed.png` | TaskCenter showing a "Resumed after restart" card | `troubleshooting.mdx`, `develop/architecture.mdx` |
| `wayback-timeline.png` | `/apps/<id>` with imported wayback rows visible | `configuration.mdx#wayback-import` |
| `wayback-historical-quarters.svg` | **Schematic mockup**, not a real screenshot. Replace with a real PNG once a contributor has run the importer against a long-tracked app and captured the full Q1 2021 → present timeline. Until then, the SVG illustrates the visual outcome of the extended floor for the cookbook DPIA recipe. | `cookbook.mdx#back-fill-a-year-of-history-before-a-regulator-audit` |
| `privacy-map.png` | `/dashboard/privacy` | `introduction.mdx` |
| `onboarding-audience.png` | `/welcome` | `quickstart.mdx#import-your-first-apps` |

## Filename conventions

- All lowercase, hyphenated, `.png` extension. Schematic mockups built from styled SVG (e.g. `wayback-historical-quarters.svg`) are an exception — they sit alongside the PNGs and get replaced one-for-one with a real screenshot when one becomes available.
- One screenshot per concept — don't combine "settings + bell + dashboard" into one.
- Use `<area>-<state>.png` when capturing the same surface in multiple states (e.g. `notification-bell-empty.png` vs. `notification-bell-open.png`).

## Replacing a schematic mockup with a real screenshot

Some entries above are SVG schematics — hand-styled approximations of what a UI surface looks like, used when the underlying capability has shipped but no contributor has captured it yet (typical for long-tail data shapes like a fully-back-filled Wayback timeline that takes weeks of Save-Page-Now requests to build out).

When you have a real install in the right state:

1. Capture the PNG following the rules above. Use the same filename stem with `.png` instead of `.svg`.
2. Update the MDX page that references the image. The path will change from `/images/<name>.svg` to `/images/<name>.png`. Mintlify renders both — there's no special syntax to swap.
3. Delete the `.svg` from `images/` in the same commit. The repo target is one canonical asset per concept; leaving both around invites the next contributor to embed the wrong one.
4. Remove the entry's "schematic mockup" wording from this table.

## Editing rules

- **Don't blur identifying detail unless it's actually personal.** Sample data is fictional; real screenshots from your own install should redact the bundle ID column if it would identify your kid's apps.
- **Keep dark-mode and light-mode versions separate** if you want a `light/` and `dark/` folder structure later — Mintlify's image syntax supports `<picture>` swaps.
- **Compress before commit.** `pngquant --quality 80-95 --strip *.png` knocks PNGs down 60-80% with no perceptible loss. The repo target is to keep `images/` under 5 MB total.

## Embedding in MDX

Mintlify accepts standard markdown:

```mdx
![Dashboard overview](/images/dashboard-overview.png)
```

For larger / explanatory shots, prefer the Mintlify `<Frame>` component to add a chrome:

```mdx
<Frame caption="Dashboard with sample data seeded">
  ![Dashboard overview](/images/dashboard-overview.png)
</Frame>
```

For light/dark dual sources:

```mdx
<Frame>
  <img className="block dark:hidden" src="/images/dashboard-overview-light.png" alt="Dashboard (light)" />
  <img className="hidden dark:block" src="/images/dashboard-overview-dark.png" alt="Dashboard (dark)" />
</Frame>
```

## Finding future placeholders

If a new page temporarily uses `/images/screenshot-placeholder.svg`, drop the real shot into this folder and update the relevant MDX page to swap out the placeholder reference.

A quick grep finds any MDX page still referencing the placeholder:

```bash
grep -rn "screenshot-placeholder" --include="*.mdx" .
```
