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
