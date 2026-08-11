# List available commands
default:
    @just --list

# Check docs structure and links (as CI does)
[group("dev")]
lint:
    npm run check
    npm run linkcheck

# Serve the docs locally with Mintlify
[group("dev")]
run:
    npm run dev

# Pull the latest changelog from the product repo
[group("dev")]
sync-changelog:
    npm run sync-changelog

# Build the Mintlify static export into dist/
[group("deploy")]
export:
    npx --yes mint@latest export
    rm -rf dist
    unzip -q export.zip -d dist

# Deploy the docs site to Cloudflare
[group("deploy")]
deploy: export
    npx --yes wrangler@latest deploy --assets dist --name docs-privacytracker --compatibility-date 2026-05-01
