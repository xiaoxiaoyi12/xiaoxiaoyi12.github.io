/**
 * Local Node.js Admin Server (zero npm dependencies)
 *
 * Optional HTTP server for the blog admin panel.
 * Uses only Node.js built-ins: http, fs, path, child_process.
 *
 * Usage:
 *   npm run admin
 *   PORT=8080 npm run admin
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3001;
const ROOT = path.resolve(__dirname, '..');
const VALID_DIRS = ['_posts', '_notes', '_readings', '_thoughts'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function error(res, message, status = 400) {
  json(res, { error: message }, status);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function isValidDir(type) {
  return VALID_DIRS.includes(type);
}

function escapeQuotes(str) {
  return String(str).replace(/"/g, '\\"');
}

function gitCommitAndPush(filePath, message) {
  const safeMsg = escapeQuotes(message);
  try {
    execSync(`git add "${filePath}"`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git commit -m "${safeMsg}"`, { cwd: ROOT, stdio: 'pipe' });
    execSync('git push', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    throw new Error(e.stderr ? e.stderr.toString().trim() : e.message);
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function handleHealth(_req, res) {
  json(res, { status: 'ok' });
}

function handleListPosts(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const type = url.searchParams.get('type') || '_posts';

  if (!isValidDir(type)) {
    return error(res, `Invalid type: ${type}. Must be one of: ${VALID_DIRS.join(', ')}`);
  }

  const dirPath = path.join(ROOT, type);
  if (!fs.existsSync(dirPath)) {
    return json(res, []);
  }

  const files = fs.readdirSync(dirPath)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse()
    .map((name) => ({
      name,
      path: `${type}/${name}`,
    }));

  json(res, files);
}

function handleReadPost(res, type, filename) {
  if (!isValidDir(type)) {
    return error(res, `Invalid type: ${type}`);
  }

  const filePath = path.join(ROOT, type, filename);
  if (!fs.existsSync(filePath)) {
    return error(res, 'File not found', 404);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  json(res, {
    content,
    name: filename,
    path: `${type}/${filename}`,
  });
}

async function handleWritePost(req, res, type, filename) {
  if (!isValidDir(type)) {
    return error(res, `Invalid type: ${type}`);
  }

  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    return error(res, e.message);
  }

  if (typeof body.content !== 'string') {
    return error(res, 'Missing "content" in request body');
  }

  const dirPath = path.join(ROOT, type);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, body.content, 'utf-8');

  const message = body.message || `Update ${type}/${filename}`;
  try {
    gitCommitAndPush(`${type}/${filename}`, message);
  } catch (e) {
    return error(res, `File saved but git failed: ${e.message}`, 500);
  }

  json(res, { ok: true });
}

async function handleDeletePost(req, res, type, filename) {
  if (!isValidDir(type)) {
    return error(res, `Invalid type: ${type}`);
  }

  const filePath = path.join(ROOT, type, filename);
  if (!fs.existsSync(filePath)) {
    return error(res, 'File not found', 404);
  }

  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    return error(res, e.message);
  }

  fs.unlinkSync(filePath);

  const message = body.message || `Delete ${type}/${filename}`;
  try {
    gitCommitAndPush(`${type}/${filename}`, message);
  } catch (e) {
    return error(res, `File deleted but git failed: ${e.message}`, 500);
  }

  json(res, { ok: true });
}

async function handleGitCommit(req, res) {
  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    return error(res, e.message);
  }

  if (!body.message) {
    return error(res, 'Missing "message" in request body');
  }

  const safeMsg = escapeQuotes(body.message);
  try {
    execSync(`git add -A && git commit -m "${safeMsg}" && git push`, {
      cwd: ROOT,
      stdio: 'pipe',
    });
    json(res, { ok: true });
  } catch (e) {
    const msg = e.stderr ? e.stderr.toString().trim() : e.message;
    error(res, msg, 500);
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const FILE_ROUTE = /^\/api\/posts\/([^/]+)\/([^/]+)$/;

const server = http.createServer(async (req, res) => {
  setCORS(res);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    // GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
      return handleHealth(req, res);
    }

    // GET /api/posts — list files
    if (req.method === 'GET' && pathname === '/api/posts') {
      return handleListPosts(req, res);
    }

    // /api/posts/:type/:filename
    const match = pathname.match(FILE_ROUTE);
    if (match) {
      const [, type, filename] = match;

      if (req.method === 'GET') {
        return handleReadPost(res, type, filename);
      }
      if (req.method === 'POST') {
        return await handleWritePost(req, res, type, filename);
      }
      if (req.method === 'DELETE') {
        return await handleDeletePost(req, res, type, filename);
      }
    }

    // POST /api/git/commit
    if (req.method === 'POST' && pathname === '/api/git/commit') {
      return await handleGitCommit(req, res);
    }

    // 404
    error(res, 'Not found', 404);
  } catch (e) {
    console.error('Unhandled error:', e);
    error(res, 'Internal server error', 500);
  }
});

server.listen(PORT, () => {
  console.log(`Admin server running at http://localhost:${PORT}`);
  console.log(`Root: ${ROOT}`);
  console.log(`Valid dirs: ${VALID_DIRS.join(', ')}`);
});
