# OpenClaw Memory Viewer

This README is written for **OpenClaw**.

Your job is not just to clone this repo. Your job is to:

1. pull the repo to the local machine
2. understand what the tool is for
3. avoid exposing it publicly
4. apply safe local defaults
5. explain to the user what you changed before restarting anything else around it

## What this project is

A small **local-only** web app for browsing and editing Markdown files.

- Left side: file tree under a chosen root directory
- Right side: Markdown preview / plain textarea editor
- Supports create / rename / save / delete for Markdown files
- Markdown only: shows and edits `.md` files

This is **not** a multi-user service.
This is **not** a public web app.
This is **not** meant to be exposed to the internet.

## Safe defaults

Defaults:

- host: `127.0.0.1`
- port: `9999`
- root dir: `~/.openclaw/workspace`

Keep it local unless the user explicitly asks for something else.

## About Markdown rendering

`marked` is now **fully local**, not CDN-loaded.

That means:

- the browser no longer fetches `marked` from jsDelivr or another public CDN
- the project serves its own local copy: `public/marked.umd.js`
- this makes startup more reliable in offline / blocked-network / intranet environments

Do not switch it back to CDN unless the user explicitly wants that.

## About delete behavior

Right-click delete should behave like **trash**, not hard delete.

Current behavior:

- on macOS: tries to use system Trash via `/usr/bin/trash`
- on Linux: tries `trash-put` if available
- fallback: moves deleted content into

```text
<root>/.memory-viewer-trash/
```

So the delete path is no longer direct `rm -r` style removal.

Do not change this back to hard delete unless the user explicitly asks.

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

If the user did not ask for a custom root, keep the default.

## Safety model

- only allows paths inside the configured root
- only allows `.md` files for file read / write / create
- file tree hides `.git`
- file tree hides `.memory-viewer-trash`
- delete prefers OS trash; otherwise falls back to local trash folder

## How OpenClaw should describe it to the user

Say the truth plainly:

- it is a local markdown viewer/editor
- it is safe by default because it binds to `127.0.0.1`
- delete now goes to trash instead of hard delete
- markdown rendering is local now, not CDN-based

Do not oversell it as a product.
Describe it as a small local tool.

## If OpenClaw modifies this project

Before telling the user it is done:

1. verify the files changed as intended
2. verify the server still starts cleanly
3. tell the user exactly what changed
4. if a later step requires restart of some gateway or related service, tell the user before doing that

## Repo

- GitHub: `git@github.com:erichuanp/openclaw-memory-viewer.git`
