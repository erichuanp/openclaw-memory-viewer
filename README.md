# OpenClaw Memory Viewer

A small local-only web app for browsing and editing Markdown files under a chosen root directory.

It is intentionally simple:
- left side: Markdown file tree
- right side: preview or plain-text editor
- supports create / rename / save / delete
- only works with `.md` files

This is **not** a public web app and **not** intended to be exposed to the internet.

## Features

- Browse Markdown files under a configured root
- Preview Markdown in the browser
- Edit and save Markdown as plain text
- Create new `.md` files
- Rename files and folders
- Delete files to trash instead of hard delete
- Delete folders by moving only contained `.md` files to trash

## Safe defaults

Default runtime configuration:

- host: `127.0.0.1`
- port: `9999`
- root dir: `~/.openclaw/workspace`

These defaults keep the app local by default.

## Install

```bash
git clone git@github.com:erichuanp/openclaw-memory-viewer.git
cd openclaw-memory-viewer
npm install
npm start
```

Open:

```text
http://127.0.0.1:9999
```

## Update

```bash
cd openclaw-memory-viewer
git pull
npm install
```

## Configuration

You can override defaults with environment variables.

### Change root directory

```bash
MEMORY_VIEWER_ROOT=/path/to/your/notes npm start
```

### Change host / port

```bash
HOST=127.0.0.1 PORT=9999 npm start
```

Unless you explicitly want remote access, keep `HOST=127.0.0.1`.

## Delete behavior

Delete is designed to behave like **trash**, not hard delete.

### Deleting a file

When deleting a Markdown file, the app tries:

- macOS system Trash via `/usr/bin/trash`
- Linux `trash-put` if available
- fallback local trash folder:

```text
<root>/.memory-viewer-trash/
```

### Deleting a folder

When deleting a folder, the app:

- recursively finds `.md` files inside that folder
- moves those `.md` files to trash
- leaves non-Markdown files untouched

This means a folder disappears from the UI once it no longer contains any visible `.md` files.

## Safety model

- binds to `127.0.0.1` by default
- only resolves paths inside the configured root
- only allows `.md` files for read / write / create
- file tree hides `.git`
- file tree hides `.memory-viewer-trash`
- Markdown rendering is served locally from `public/marked.umd.js`

## Development notes

- server entry: `server.js`
- static frontend: `public/index.html`
- Markdown renderer: `marked`

## License

Currently `ISC` (see `package.json`).
