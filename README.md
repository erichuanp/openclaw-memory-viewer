# OpenClaw Memory Viewer

A small local web app for browsing and editing Markdown files.

## What it does

- Left side: file tree under a chosen root directory
- Right side: Markdown preview / plain textarea editor
- Supports create / rename / save / delete for Markdown files
- Markdown only: shows and edits `.md` files

## Intended use

This is a **local-only personal tool**, not a multi-user service.

Defaults:

- host: `127.0.0.1`
- port: `9999`
- root dir: `~/.openclaw/workspace`

Do **not** expose it to the public internet.

## Start

```bash
git clone git@github.com:erichuanp/openclaw-memory-viewer.git
cd openclaw-memory-viewer
node server.js
```

Open:

```text
http://127.0.0.1:9999
```

## Optional configuration

You can override the defaults with environment variables.

### Change root directory

```bash
MEMORY_VIEWER_ROOT=/path/to/your/notes node server.js
```

### Change host / port

```bash
HOST=127.0.0.1 PORT=9999 node server.js
```

## Safety model

- Only allows paths inside the configured root
- Only allows `.md` files for file read/write/create
- Deleted files/folders are moved to:

```text
<root>/.memory-viewer-trash/
```

instead of being permanently removed immediately.

## Notes

- Uses a CDN copy of `marked` in the browser for Markdown rendering
- Designed to stay simple and easy to fork
- Good fit for OpenClaw workspace notes, Obsidian-like markdown folders, or other local note trees
