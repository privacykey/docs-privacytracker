#!/usr/bin/env node

// Fetch the upstream CHANGELOG.md from privacykey/privacytracker@main and convert
// it to a Mintlify-shaped changelog.mdx. Idempotent — running twice in a row
// produces the same output. Exits non-zero on fetch or write errors.
//
// Usage:
//   node scripts/sync-changelog.mjs                  # fetch from main repo (default)
//   node scripts/sync-changelog.mjs path/to/file.md  # use a local file (testing)
//
// CI runs this from .github/workflows/sync-changelog.yml on a daily cron and
// opens a PR if the result differs from changelog.mdx.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(root, "changelog.mdx");

const UPSTREAM_URL =
  "https://raw.githubusercontent.com/privacykey/privacytracker/main/CHANGELOG.md";

const FRONTMATTER = `---
title: Changelog
description: "Notable changes to privacytracker, version by version."
---
`;

// Map upstream wiki / repo paths to their docs-site equivalents. Keep readers
// inside the docs site when there's a counterpart page; otherwise fall back
// based on path shape (see rewriteRelativeTarget). Add an entry here whenever
// a new wiki page gets mirrored into a docs-site page.
const WIKI_TO_DOCS = {
  ".github/wiki/Feature-Flag-Inventory.md": "/develop/feature-flags",
  ".github/wiki/Architecture.md": "/develop/architecture",
  ".github/wiki/API-Reference.md": "/api-reference/introduction",
  ".github/wiki/Translations.md": "/develop/translations",
  ".github/wiki/Security.md": "/security",
};

// Public docs (and wiki content) now live on Plane. Any unmapped wiki path
// from upstream CHANGELOG.md gets pointed here.
const PLANE_URL =
  "https://sites.plane.so/issues/39b6604351894f09a5e903acce37d265";

// Non-wiki repo paths (workflow files, crowdin.yml, lib/* references, etc.)
// still resolve on GitHub.
const REPO_BLOB_PREFIX =
  "https://github.com/privacykey/privacytracker/blob/main/";

const INTRO = `
This page mirrors [\`CHANGELOG.md\`](https://github.com/privacykey/privacytracker/blob/main/CHANGELOG.md) in the main repo, which is generated automatically by \`.github/workflows/release.yml\` on every Run-workflow click of the Release action. The source is canonical; if anything diverges, trust the source.

<Tip>
  Looking for what's currently in flight (not yet released)? See the [privacytracker Plane board](${PLANE_URL}).
</Tip>
`;

async function loadSource(arg) {
  if (arg) {
    const localPath = path.resolve(process.cwd(), arg);
    return fs.readFileSync(localPath, "utf8");
  }

  const response = await fetch(UPSTREAM_URL, {
    headers: { "User-Agent": "privacytracker-docs-sync" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${UPSTREAM_URL}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

// Upstream section headings, in both shapes we've shipped:
//   Keep a Changelog (current): `## [Unreleased]`, `## [0.1.2] — 2026-06-12`
//   Legacy release.yml output:  `## v1.1.0 — Title`
// Anchored at `##` so `### Added` subsections inside an entry never match.
const VERSION_HEADING = /^##\s+(?:\[[^\]]+\]|v\d)/i;

function stripUpstreamHeader(source) {
  // The upstream file starts with:
  //
  //     # Changelog
  //
  //     All notable changes to this project are documented here. The format is
  //     based on Keep a Changelog ...
  //
  // We replace that with our own frontmatter + intro and keep everything from
  // the first version section onwards — including `[Unreleased]`, which is
  // where in-flight work lands between releases.
  const lines = source.split("\n");
  const versionStart = lines.findIndex((line) => VERSION_HEADING.test(line));

  if (versionStart === -1) {
    throw new Error(
      "Upstream CHANGELOG.md has no version section (## [X.Y.Z] or ## vX.Y.Z) — refusing to overwrite changelog.mdx blindly.",
    );
  }

  return lines.slice(versionStart).join("\n").trimEnd();
}

function escapeMdxBraces(body) {
  // MDX treats `{` and `}` as JSX expression delimiters. The upstream
  // CHANGELOG.md occasionally references things like `{count, plural, …}` in
  // prose. Wrap any standalone braces inside backticks to be safe — the smoke
  // check parses the result as MDX and will catch any leftover trouble.
  return body.replace(/(?<!`)\{([^}\n`]+?)\}(?!`)/g, "`{$1}`");
}

function rewriteRelativeTarget(target) {
  // Strip `./` / `../` walks first so a link like `../../crowdin.yml` from a
  // file deep in the wiki resolves to `crowdin.yml` at repo root.
  const cleaned = target.replace(/^(\.\.?\/)+/, "");

  if (Object.prototype.hasOwnProperty.call(WIKI_TO_DOCS, cleaned)) {
    return WIKI_TO_DOCS[cleaned];
  }

  // Wiki content moved to Plane — any unmapped wiki path goes there.
  // Promote a wiki page to a real docs-site equivalent by adding it to
  // WIKI_TO_DOCS above.
  if (cleaned.startsWith(".github/wiki/")) {
    return PLANE_URL;
  }

  // Non-wiki repo paths (workflow files, configs, lib/* references) still
  // resolve on GitHub.
  return `${REPO_BLOB_PREFIX}${cleaned}`;
}

function rewriteLinks(body) {
  // Match markdown links `[text](target)` and `[text](target "title")`. Skip
  // anything that already looks absolute (http(s)://, mailto:, /, #).
  return body.replace(
    /(\]\()([^)\s]+)(\s+"[^"]*")?(\))/g,
    (match, open, target, title, close) => {
      if (
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("mailto:") ||
        target.startsWith("/") ||
        target.startsWith("#")
      ) {
        return match;
      }

      const rewritten = rewriteRelativeTarget(target);
      return `${open}${rewritten}${title ?? ""}${close}`;
    },
  );
}

function buildMdx(source) {
  const body = stripUpstreamHeader(source);
  return `${FRONTMATTER}${INTRO}\n${rewriteLinks(escapeMdxBraces(body))}\n`;
}

function readCurrent() {
  if (!fs.existsSync(targetPath)) {
    return null;
  }
  return fs.readFileSync(targetPath, "utf8");
}

function main() {
  const arg = process.argv[2];

  loadSource(arg)
    .then((source) => {
      const next = buildMdx(source);
      const current = readCurrent();

      if (current === next) {
        console.log("changelog.mdx is already up-to-date.");
        return;
      }

      fs.writeFileSync(targetPath, next, "utf8");

      const upstreamLabel = arg ?? UPSTREAM_URL;
      console.log(`Wrote changelog.mdx from ${upstreamLabel}.`);
    })
    .catch((error) => {
      console.error(`sync-changelog failed: ${error.message}`);
      process.exit(1);
    });
}

main();
