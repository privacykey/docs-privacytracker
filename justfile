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
    mkdir -p dist
    unzip -q -o export.zip -d dist || python3 -m zipfile -e export.zip dist
    cp .assetsignore dist/.assetsignore

# Deploy the docs site to Cloudflare
[group("deploy")]
deploy: export
    npx --yes wrangler@latest deploy
