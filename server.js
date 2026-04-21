const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 9999);
const HOST = process.env.HOST || '127.0.0.1';
const DEFAULT_ROOT = path.resolve(os.homedir(), '.openclaw/workspace');
const ROOT = path.resolve(process.env.MEMORY_VIEWER_ROOT || DEFAULT_ROOT);
const PUBLIC_DIR = path.join(__dirname, 'public');
const TRASH_DIR = path.join(ROOT, '.memory-viewer-trash');

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendText(res, code, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': contentType });
  res.end(text);
}

function safeResolve(relPath) {
  const cleaned = String(relPath || '').replace(/^\/+/, '');
  const fullPath = path.resolve(ROOT, cleaned);
  if (!fullPath.startsWith(ROOT)) return null;
  return fullPath;
}

function validateMdPath(relPath) {
  return typeof relPath === 'string' && relPath.toLowerCase().endsWith('.md');
}

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', (error) => resolve({ ok: false, error }));
    child.on('close', (code) => resolve({ ok: code === 0, code }));
  });
}

async function moveToTrash(relPath, fullPath) {
  if (process.platform === 'darwin') {
    const result = await runCommand('/usr/bin/trash', [fullPath]);
    if (result.ok) {
      return { mode: 'system-trash', target: 'macOS Trash' };
    }
  }

  const trashPut = await runCommand('trash-put', [fullPath]);
  if (trashPut.ok) {
    return { mode: 'system-trash', target: 'freedesktop trash' };
  }

  const target = path.join(TRASH_DIR, `${timestampId()}__${relPath.replace(/[\\/]/g, '__')}`);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.rename(fullPath, target);
  return { mode: 'local-trash', target };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function buildTree(dir, rel = '') {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const children = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.git')) continue;
    if (entry.name === '.memory-viewer-trash') continue;
    const entryRel = path.join(rel, entry.name);
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subtree = await buildTree(full, entryRel);
      if (subtree.length > 0) {
        children.push({ type: 'dir', name: entry.name, path: entryRel, children: subtree });
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      children.push({ type: 'file', name: entry.name, path: entryRel });
    }
  }
  return children;
}

async function handleFsAction(body) {
  const action = body.action;

  if (action === 'create_file') {
    const relPath = body.path || '';
    if (!validateMdPath(relPath)) throw new Error('Only .md files are allowed.');
    const full = safeResolve(relPath);
    if (!full) throw new Error('Invalid path.');

    await fsp.mkdir(path.dirname(full), { recursive: true });
    const exists = await fsp.stat(full).catch(() => null);
    if (exists) throw new Error('File already exists.');
    await fsp.writeFile(full, body.content || '', 'utf8');
    return { ok: true, path: relPath };
  }

  if (action === 'rename') {
    const fromPath = body.fromPath || '';
    const toName = String(body.toName || '').trim();
    if (!toName) throw new Error('New name is required.');

    const fromFull = safeResolve(fromPath);
    if (!fromFull) throw new Error('Invalid source path.');
    const stat = await fsp.stat(fromFull).catch(() => null);
    if (!stat) throw new Error('Source not found.');

    const parentRel = path.dirname(fromPath) === '.' ? '' : path.dirname(fromPath);
    const toPath = parentRel ? path.join(parentRel, toName) : toName;

    if (stat.isFile()) {
      if (!validateMdPath(fromPath)) throw new Error('Only .md files are allowed.');
      const oldExt = path.extname(fromPath).toLowerCase();
      const newExt = path.extname(toName).toLowerCase();
      if (newExt !== oldExt) throw new Error('File extension cannot be changed.');
      if (!validateMdPath(toPath)) throw new Error('Only .md files are allowed.');
    }

    const toFull = safeResolve(toPath);
    if (!toFull) throw new Error('Invalid target path.');
    const targetExists = await fsp.stat(toFull).catch(() => null);
    if (targetExists) throw new Error('Target already exists.');

    await fsp.rename(fromFull, toFull);
    return { ok: true, fromPath, toPath };
  }

  if (action === 'delete') {
    const relPath = body.path || '';
    const full = safeResolve(relPath);
    if (!full) throw new Error('Invalid path.');
    const stat = await fsp.stat(full).catch(() => null);
    if (!stat) throw new Error('Path not found.');

    if (stat.isFile() && !validateMdPath(relPath)) {
      throw new Error('Only .md files are allowed.');
    }

    const trashed = await moveToTrash(relPath, full);
    return { ok: true, path: relPath, trashed };
  }

  throw new Error('Unknown action.');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/tree' && req.method === 'GET') {
      const tree = await buildTree(ROOT);
      return sendJson(res, 200, { root: ROOT, tree });
    }

    if (url.pathname === '/api/file' && req.method === 'GET') {
      const relPath = url.searchParams.get('path') || '';
      if (!validateMdPath(relPath)) return sendJson(res, 400, { error: 'Only .md files are allowed.' });
      const full = safeResolve(relPath);
      if (!full) return sendJson(res, 400, { error: 'Invalid path.' });
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat || !stat.isFile()) return sendJson(res, 404, { error: 'File not found.' });
      const content = await fsp.readFile(full, 'utf8');
      return sendJson(res, 200, { path: relPath, content });
    }

    if (url.pathname === '/api/file' && req.method === 'POST') {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON body.' });
      }

      const relPath = body.path || '';
      const content = typeof body.content === 'string' ? body.content : null;
      if (!validateMdPath(relPath)) return sendJson(res, 400, { error: 'Only .md files are allowed.' });
      if (content === null) return sendJson(res, 400, { error: 'content must be string.' });

      const full = safeResolve(relPath);
      if (!full) return sendJson(res, 400, { error: 'Invalid path.' });
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat || !stat.isFile()) return sendJson(res, 404, { error: 'File not found.' });

      await fsp.writeFile(full, content, 'utf8');
      return sendJson(res, 200, { ok: true, path: relPath });
    }

    if (url.pathname === '/api/fs' && req.method === 'POST') {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON body.' });
      }

      try {
        const result = await handleFsAction(body);
        return sendJson(res, 200, result);
      } catch (e) {
        return sendJson(res, 400, { error: e.message || 'FS action failed.' });
      }
    }

    const filePath = url.pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, url.pathname);
    const normalized = path.resolve(filePath);
    if (!normalized.startsWith(path.resolve(PUBLIC_DIR))) return sendText(res, 403, 'Forbidden');

    const ext = path.extname(normalized).toLowerCase();
    const contentTypeMap = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };

    const data = await fsp.readFile(normalized);
    return sendText(res, 200, data, contentTypeMap[ext] || 'application/octet-stream');
  } catch (err) {
    if (err && err.code === 'ENOENT') return sendText(res, 404, 'Not Found');
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Memory viewer running at http://${HOST}:${PORT}`);
  console.log(`Workspace root: ${ROOT}`);
  console.log(`Fallback trash dir: ${TRASH_DIR}`);
});
