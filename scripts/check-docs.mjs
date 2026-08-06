#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];
const anchorCache = new Map();
const linkedFileCache = new Set();
const navPageCache = new Set();

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/") || ".";
}

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    addError(`${relative(filePath)} could not be parsed as JSON: ${error.message}`);
    return null;
  }
}

function stripCodeFences(source) {
  return source
    .replace(/```[\s\S]*?```/g, (block) => "\n".repeat(block.split("\n").length - 1))
    .replace(/~~~[\s\S]*?~~~/g, (block) => "\n".repeat(block.split("\n").length - 1));
}

function splitTarget(target) {
  const withoutQuery = target.split("?")[0];
  const hashIndex = withoutQuery.indexOf("#");

  if (hashIndex === -1) {
    return { targetPath: withoutQuery, anchor: "" };
  }

  return {
    targetPath: withoutQuery.slice(0, hashIndex),
    anchor: decodeURIComponent(withoutQuery.slice(hashIndex + 1)),
  };
}

function isExternal(target) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target);
}

function trimMarkdownTarget(target) {
  const trimmed = target.trim();
  const angleWrapped = trimmed.match(/^<([^>]+)>$/);

  if (angleWrapped) {
    return angleWrapped[1];
  }

  return trimmed.split(/\s+/)[0];
}

function slugify(heading) {
  return heading
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function collectAnchors(filePath) {
  if (anchorCache.has(filePath)) {
    return anchorCache.get(filePath);
  }

  const source = stripCodeFences(fs.readFileSync(filePath, "utf8"));
  const anchors = new Set();
  const seen = new Map();
  const headingPattern = /^#{1,6}\s+(.+?)\s*#*\s*$/gm;

  for (const match of source.matchAll(headingPattern)) {
    const baseSlug = slugify(match[1]);

    if (!baseSlug) {
      continue;
    }

    const seenCount = seen.get(baseSlug) ?? 0;
    const slug = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount}`;
    seen.set(baseSlug, seenCount + 1);
    anchors.add(slug);
  }

  anchorCache.set(filePath, anchors);
  return anchors;
}

function resolveFile(targetPath, sourceFile) {
  const base = targetPath.startsWith("/")
    ? path.join(root, targetPath.slice(1))
    : path.resolve(path.dirname(sourceFile), targetPath);

  if (exists(base)) {
    return base;
  }

  if (!path.extname(base)) {
    for (const extension of [".mdx", ".md"]) {
      const candidate = `${base}${extension}`;
      if (exists(candidate)) {
        return candidate;
      }
    }
  }

  return base;
}

function isInsideRoot(filePath) {
  const relativePath = path.relative(root, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function checkAssetReference(target, context) {
  if (!target || !target.startsWith("/")) {
    return;
  }

  const { targetPath } = splitTarget(target);
  const filePath = path.join(root, targetPath.slice(1));

  if (!exists(filePath)) {
    addError(`${context} references missing asset ${target}`);
  }
}

function checkPageSlug(slug, context) {
  const filePath = path.join(root, `${slug}.mdx`);

  if (!exists(filePath)) {
    addError(`${context} references missing page ${slug}.mdx`);
    return;
  }

  linkedFileCache.add(filePath);
  navPageCache.add(filePath);
}

function checkOpenApiReference(openapiPath, context) {
  const filePath = path.join(root, openapiPath);

  if (!exists(filePath)) {
    addError(`${context} references missing OpenAPI file ${openapiPath}`);
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");
  if (!/^openapi:\s*3\./m.test(source)) {
    addError(`${openapiPath} does not look like an OpenAPI 3.x spec`);
  }
  if (!/^paths:\s*$/m.test(source)) {
    addError(`${openapiPath} is missing a top-level paths section`);
  }
}

function checkDocsJson() {
  const docsPath = path.join(root, "docs.json");
  const docs = readJson(docsPath);

  if (!docs) {
    return;
  }

  checkAssetReference(docs.favicon, "docs.json favicon");
  checkAssetReference(docs.logo?.light, "docs.json logo.light");
  checkAssetReference(docs.logo?.dark, "docs.json logo.dark");

  for (const [tabIndex, tab] of (docs.navigation?.tabs ?? []).entries()) {
    const tabLabel = tab.tab ?? `tab ${tabIndex + 1}`;

    for (const [groupIndex, group] of (tab.groups ?? []).entries()) {
      const groupLabel = group.group ?? `group ${groupIndex + 1}`;
      const context = `docs.json navigation ${tabLabel} > ${groupLabel}`;

      for (const page of group.pages ?? []) {
        if (typeof page === "string") {
          checkPageSlug(page, context);
        }
      }

      if (group.openapi) {
        checkOpenApiReference(group.openapi, context);
      }
    }
  }
}

function shouldIgnoreLink(target) {
  return (
    !target ||
    target.startsWith("#") ||
    isExternal(target) ||
    target.startsWith("mailto:") ||
    target.startsWith("tel:") ||
    target.includes("{{") ||
    target.includes("<")
  );
}

function checkInternalLink(target, sourceFile, lineNumber) {
  if (shouldIgnoreLink(target)) {
    return;
  }

  const { targetPath, anchor } = splitTarget(target);
  const targetFile = resolveFile(targetPath || relative(sourceFile), sourceFile);
  const sourceLabel = `${relative(sourceFile)}:${lineNumber}`;

  if (!isInsideRoot(targetFile)) {
    addError(`${sourceLabel} points outside the docs root: ${target}`);
    return;
  }

  if (!exists(targetFile)) {
    addError(`${sourceLabel} points to missing file or page: ${target}`);
    return;
  }

  linkedFileCache.add(targetFile);

  if (anchor && [".md", ".mdx"].includes(path.extname(targetFile))) {
    const anchors = collectAnchors(targetFile);
    if (!anchors.has(anchor)) {
      addError(`${sourceLabel} points to missing anchor #${anchor} in ${relative(targetFile)}`);
    }
  }
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}

function checkContentFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const searchable = stripCodeFences(source);
  const markdownLinkPattern = /!?\[[^\]]*?\]\(([^)]+)\)/g;
  const jsxAttributePattern = /\b(?:href|src)=["']([^"']+)["']/g;

  for (const match of searchable.matchAll(markdownLinkPattern)) {
    const target = trimMarkdownTarget(match[1]);
    checkInternalLink(target, filePath, lineNumberForIndex(searchable, match.index ?? 0));
  }

  for (const match of searchable.matchAll(jsxAttributePattern)) {
    checkInternalLink(match[1], filePath, lineNumberForIndex(searchable, match.index ?? 0));
  }
}

function walkFiles(directory, predicate, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".mintlify", "node_modules"].includes(entry.name)) {
      continue;
    }

    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(filePath, predicate, files);
    } else if (predicate(filePath)) {
      files.push(filePath);
    }
  }

  return files;
}

function checkHiddenPages() {
  const contentPages = walkFiles(root, (filePath) => filePath.endsWith(".mdx"));

  for (const page of contentPages) {
    if (relative(page).startsWith("snippets/")) {
      continue;
    }

    if (!navPageCache.has(page)) {
      addWarning(`${relative(page)} is not listed in docs.json navigation`);
    }
  }
}

checkDocsJson();

for (const filePath of walkFiles(root, (candidate) => [".md", ".mdx"].includes(path.extname(candidate)))) {
  checkContentFile(filePath);
}

checkHiddenPages();

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (errors.length > 0) {
  console.error("Docs check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Docs check passed (${linkedFileCache.size} linked files checked).`);
