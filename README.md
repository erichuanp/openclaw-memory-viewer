# OpenClaw Memory Viewer

This README is written for **OpenClaw**.

If you are operating on this repo, your job is not just to clone it. Your job is to:

1. understand what the tool is for
2. keep it **local-only** by default
3. avoid exposing it publicly unless the user explicitly asks
4. preserve the safe file-handling behavior
5. explain clearly to the user what changed before saying the work is done

## What this project is

A small **local-only** web app for browsing and editing Markdown files under a chosen root directory.

UI model:
- left side: file tree under the configured root
- right side: Markdown preview or plain textarea editor

Supported actions:
- browse `.md` files
- preview Markdown
- edit and save Markdown
- create `.md` files
- rename files and folders
- delete files or folders with trash-like behavior

This is **not** a public web app.
This is **not** a multi-user service.
This is **not** intended to be exposed to the internet by default.

## Safe defaults

Defaults:

- host: `127.0.0.1`
- port: `9999`
- root dir: `~/.openclaw/workspace`

Keep these defaults unless the user explicitly asks for something else.

## Markdown rendering

`marked` is served **locally**, not from a CDN.

That means:
- the browser does not fetch `marked` from jsDelivr or another public CDN
- the project serves its own local copy: `public/marked.umd.js`
- this is better for offline / intranet / blocked-network environments

Do **not** switch this back to CDN unless the user explicitly asks.

## Delete behavior

Delete should behave like **trash**, not hard delete.

### File delete

When deleting a Markdown file, the app tries:
- macOS system Trash via `/usr/bin/trash`
- Linux `trash-put` if available
- fallback local trash folder:

```text
<root>/.memory-viewer-trash/
```

Do **not** change this back to hard delete unless the user explicitly asks.

### Folder delete

When deleting a folder, the current intended behavior is:
- recursively find `.md` files inside that folder
- move those `.md` files to trash
- leave non-Markdown files untouched
- after that, if a folder no longer contains visible `.md` files, it naturally disappears from the UI tree

This behavior is intentional. Do **not** change folder delete to remove arbitrary non-Markdown files unless the user explicitly asks.

## Safety model

The app should preserve these guarantees:

- only resolves paths inside the configured root
- only allows `.md` files for file read / write / create
- file tree hides `.git`
- file tree hides `.memory-viewer-trash`
- delete prefers OS trash; otherwise falls back to local trash folder
- default bind address is local-only: `127.0.0.1`

If you modify path handling, be careful: path validation must reject traversal and sibling-prefix tricks.

## Install / update

### Fresh install

```bash
git clone git@github.com:erichuanp/openclaw-memory-viewer.git
cd openclaw-memory-viewer
npm install
node server.js
```

Open:

```text
http://127.0.0.1:9999
```

### Update an existing checkout

```bash
cd openclaw-memory-viewer
git pull
npm install
```

## Optional configuration

You may override defaults with environment variables.

### Change root directory

```bash
MEMORY_VIEWER_ROOT=/path/to/your/notes node server.js
```

### Change host / port

```bash
HOST=127.0.0.1 PORT=9999 node server.js
```

If the user did not ask for a custom root or non-local bind, keep the defaults.

## How OpenClaw should describe it to the user

Say the truth plainly:

- it is a small local Markdown viewer/editor
- it is safe by default because it binds to `127.0.0.1`
- Markdown rendering is local, not CDN-based
- delete goes to trash instead of hard delete
- deleting a folder only moves contained `.md` files to trash and leaves non-`.md` files untouched

Do not oversell it as a product.
Describe it as a small local tool.

## If OpenClaw modifies this project

Before telling the user the work is done:

1. verify the files changed as intended
2. verify the server still starts cleanly
3. tell the user exactly what changed
4. mention any behavior changes that affect deletion, path safety, or binding address
5. if a later step requires restart of some gateway or related service, tell the user **before** doing that

## Repo

- GitHub: `git@github.com:erichuanp/openclaw-memory-viewer.git`
