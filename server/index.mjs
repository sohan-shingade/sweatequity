// SweatEquity backend — zero-dependency Node server.
// Data: SQLite + photos on disk (server/data/). Sync: SSE. Food macros: `claude -p`.
// Run: node server/index.mjs   (PORT=8790, SWEAT_DATA_DIR, CLAUDE_BIN overridable)
import { createServer } from 'node:http';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { db, dataDir, userRow, logRow, summaryRow, foodRow } from './db.mjs';

const PORT = Number(process.env.PORT || 8790);
const CLAUDE_BIN = process.env.CLAUDE_BIN || join(homedir(), '.local/bin/claude');

// --- helpers ---

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body ?? null));
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > 15 * 1024 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}); }
    catch { reject(new Error('bad json')); }
  });
  req.on('error', reject);
});

const generatePairingCode = (name) => {
  const clean = (name || 'USR').replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = (clean + 'XXX').slice(0, 3);
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Save a data-URL image to disk, return its public path.
const savePhoto = async (dataUrl) => {
  const m = /^data:image\/(\w+);base64,(.+)$/s.exec(dataUrl || '');
  if (!m) return null;
  const file = `${randomUUID()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  await writeFile(join(dataDir, 'photos', file), Buffer.from(m[2], 'base64'));
  return `/photos/${file}`;
};

// --- SSE: clients refetch on any data change ---

const sseClients = new Set();
const broadcast = (kind) => {
  for (const res of sseClients) res.write(`data: ${kind}\n\n`);
};

// --- food macro analysis via claude -p ---

const analyzeFood = (photoPath, description) => new Promise((resolve) => {
  const parts = [];
  if (photoPath) parts.push(`Use the Read tool to look at the food photo at ${photoPath}.`);
  if (description) parts.push(`The user describes it as: "${description.slice(0, 500)}".`);
  const prompt = `You are a nutrition estimator. ${parts.join(' ')}
Estimate the macros for the entire meal shown/described. Respond with ONLY a JSON object, no other text:
{"calories": <int>, "protein": <int grams>, "carbs": <int grams>, "fat": <int grams>, "confidence": "low"|"medium"|"high", "notes": "<one short sentence about what you saw and assumed>"}`;

  // Strip proxy/session vars so the child uses the normal subscription login,
  // even when this server was started from inside a Claude Code session.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) =>
    !/^(ANTHROPIC_|CLAUDE_CODE_|CLAUDECODE|CLAUDE_PID|CLAUDE_JOB_DIR)/.test(k)));
  execFile(CLAUDE_BIN, ['-p', prompt, '--output-format', 'json', '--allowedTools', 'Read'],
    { timeout: 180_000, maxBuffer: 4 * 1024 * 1024, env },
    (err, stdout) => {
      try {
        const result = JSON.parse(stdout).result;
        const m = /\{[\s\S]*\}/.exec(result);
        const macros = JSON.parse(m[0]);
        resolve({
          calories: Math.round(macros.calories), protein: Math.round(macros.protein),
          carbs: Math.round(macros.carbs), fat: Math.round(macros.fat),
          confidence: macros.confidence || 'low', notes: macros.notes || '',
        });
      } catch {
        console.error('food analysis failed:', err?.message || 'unparseable output');
        resolve(null);
      }
    });
});

// --- prepared statements ---

const q = {
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  userByToken: db.prepare('SELECT * FROM users WHERE token = ?'),
  userByCode: db.prepare('SELECT * FROM users WHERE pairingCode = ?'),
  insertUser: db.prepare(`INSERT INTO users (id, token, email, name, avatar, goalDays, pairingCode, partnerId, wagerAmount, lastResetDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  logsForUsers: db.prepare('SELECT * FROM logs WHERE userId IN (?, ?) ORDER BY date DESC LIMIT 400'),
  insertLog: db.prepare(`INSERT INTO logs (id, userId, date, activity, subType, durationMinutes, photoUrl, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  logById: db.prepare('SELECT * FROM logs WHERE id = ?'),
  deleteLog: db.prepare('DELETE FROM logs WHERE id = ?'),
  upsertSummary: db.prepare(`INSERT OR REPLACE INTO summaries (id, weekStarting, weekEnding, participantIds, stats)
    VALUES (?, ?, ?, ?, ?)`),
  summaries: db.prepare(`SELECT * FROM summaries WHERE participantIds LIKE ? ORDER BY weekStarting DESC LIMIT 20`),
  insertFood: db.prepare(`INSERT INTO food_logs (id, userId, date, createdAt, description, photoUrl, calories, protein, carbs, fat, confidence, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  foodById: db.prepare('SELECT * FROM food_logs WHERE id = ?'),
  foodForUsersOnDate: db.prepare('SELECT * FROM food_logs WHERE userId IN (?, ?) AND date = ? ORDER BY createdAt'),
  deleteFood: db.prepare('DELETE FROM food_logs WHERE id = ?'),
};

const setUser = (id, fields) => {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  db.prepare(`UPDATE users SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
    .run(...keys.map(k => fields[k]), id);
};

// --- server ---

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // static photos
    if (req.method === 'GET' && path.startsWith('/photos/')) {
      const file = path.slice('/photos/'.length);
      if (file.includes('/') || file.includes('..')) return json(res, 400, { error: 'bad path' });
      try {
        const buf = await readFile(join(dataDir, 'photos', file));
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' });
        return res.end(buf);
      } catch { return json(res, 404, { error: 'not found' }); }
    }

    // static frontend (vite build output) — makes the server the whole deployment
    if (req.method === 'GET' && !path.startsWith('/api/')) {
      const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
      const rel = path === '/' ? 'index.html' : path.slice(1);
      if (!rel.includes('..')) {
        try {
          const buf = await readFile(join(distDir, rel));
          const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon' };
          res.writeHead(200, { 'Content-Type': types[rel.split('.').pop()] || 'application/octet-stream' });
          return res.end(buf);
        } catch {
          if (!rel.includes('.')) { // SPA fallback
            try {
              const buf = await readFile(join(distDir, 'index.html'));
              res.writeHead(200, { 'Content-Type': 'text/html' });
              return res.end(buf);
            } catch {}
          }
        }
      }
      return json(res, 404, { error: 'not found' });
    }

    // --- unauthenticated ---
    if (req.method === 'POST' && path === '/api/signup') {
      const { name } = await readBody(req);
      if (!name?.trim()) return json(res, 400, { error: 'name required' });
      const id = randomUUID();
      const token = randomBytes(24).toString('hex');
      const user = {
        id, email: '', name: name.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
        goalDays: 0, pairingCode: generatePairingCode(name), partnerId: null,
        wagerAmount: 0, lastResetDate: new Date().toISOString(),
      };
      q.insertUser.run(id, token, user.email, user.name, user.avatar, user.goalDays,
        user.pairingCode, null, user.wagerAmount, user.lastResetDate);
      return json(res, 200, { user, token });
    }

    // --- authenticated ---
    // (?token= supported because EventSource can't set headers)
    const token = (req.headers.authorization || '').replace(/^Bearer /, '') || url.searchParams.get('token') || '';
    const me = userRow(token ? q.userByToken.get(token) : null);
    if (!me) return json(res, 401, { error: 'unauthorized' });

    if (req.method === 'GET' && path === '/api/me') return json(res, 200, me);

    if (req.method === 'GET' && path === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('data: connected\n\n');
      sseClients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
      return;
    }

    if (req.method === 'GET' && path.startsWith('/api/users/code/')) {
      const code = decodeURIComponent(path.split('/').pop()).toUpperCase();
      return json(res, 200, userRow(q.userByCode.get(code)));
    }

    if (req.method === 'GET' && path.startsWith('/api/users/')) {
      return json(res, 200, userRow(q.userById.get(path.split('/').pop())));
    }

    if (req.method === 'PATCH' && path.startsWith('/api/users/')) {
      const id = path.split('/').pop();
      if (id !== me.id) return json(res, 403, { error: 'forbidden' });
      const body = await readBody(req);
      const allowed = ['name', 'avatar', 'goalDays', 'wagerAmount', 'lastResetDate'];
      const fields = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
      if (typeof fields.avatar === 'string' && fields.avatar.startsWith('data:')) {
        fields.avatar = (await savePhoto(fields.avatar)) || me.avatar;
      }
      setUser(id, fields);
      broadcast('users');
      return json(res, 200, userRow(q.userById.get(id)));
    }

    if (req.method === 'POST' && path === '/api/goals') {
      const { goal, wager } = await readBody(req);
      setUser(me.id, { goalDays: goal, wagerAmount: wager });
      if (me.partnerId) setUser(me.partnerId, { goalDays: goal, wagerAmount: wager });
      broadcast('users');
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/api/link') {
      const { code } = await readBody(req);
      const partner = userRow(q.userByCode.get((code || '').toUpperCase()));
      if (!partner) return json(res, 400, { error: 'Invalid Partner Code' });
      if (partner.id === me.id) return json(res, 400, { error: 'You cannot link to yourself.' });
      if (partner.partnerId) return json(res, 400, { error: 'This user is already in a battle.' });
      setUser(me.id, { partnerId: partner.id });
      setUser(partner.id, { partnerId: me.id, wagerAmount: me.wagerAmount });
      broadcast('users');
      return json(res, 200, {
        user: userRow(q.userById.get(me.id)),
        partner: userRow(q.userById.get(partner.id)),
      });
    }

    if (req.method === 'POST' && path === '/api/unlink') {
      if (me.partnerId) setUser(me.partnerId, { partnerId: null });
      setUser(me.id, { partnerId: null });
      broadcast('users');
      return json(res, 200, { ok: true });
    }

    // --- workout logs ---
    if (req.method === 'GET' && path === '/api/logs') {
      const rows = q.logsForUsers.all(me.id, me.partnerId || me.id);
      return json(res, 200, rows.map(logRow));
    }

    if (req.method === 'POST' && path === '/api/logs') {
      const log = await readBody(req);
      const photoUrl = log.photoUrl?.startsWith('data:') ? await savePhoto(log.photoUrl) : (log.photoUrl || null);
      q.insertLog.run(log.id || randomUUID(), me.id, log.date, log.activity,
        log.subType ?? null, log.durationMinutes || 0, photoUrl, log.verified ? 1 : 0);
      broadcast('logs');
      return json(res, 200, { ok: true });
    }

    if ((req.method === 'PATCH' || req.method === 'DELETE') && path.startsWith('/api/logs/')) {
      const id = path.split('/').pop();
      const existing = q.logById.get(id);
      if (!existing) return json(res, 404, { error: 'not found' });
      if (existing.userId !== me.id) return json(res, 403, { error: 'forbidden' });
      if (req.method === 'DELETE') {
        q.deleteLog.run(id);
      } else {
        const body = await readBody(req);
        if (body.photoUrl?.startsWith('data:')) body.photoUrl = await savePhoto(body.photoUrl);
        const allowed = ['date', 'activity', 'subType', 'durationMinutes', 'photoUrl', 'verified'];
        const fields = Object.entries(body).filter(([k]) => allowed.includes(k));
        if (fields.length) {
          db.prepare(`UPDATE logs SET ${fields.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`)
            .run(...fields.map(([, v]) => typeof v === 'boolean' ? (v ? 1 : 0) : v), id);
        }
      }
      broadcast('logs');
      return json(res, 200, { ok: true });
    }

    // --- weekly summaries ---
    if (req.method === 'GET' && path === '/api/summaries') {
      return json(res, 200, q.summaries.all(`%"${me.id}"%`).map(summaryRow));
    }

    if (req.method === 'PUT' && path.startsWith('/api/summaries/')) {
      const s = await readBody(req);
      q.upsertSummary.run(s.id, s.weekStarting, s.weekEnding,
        JSON.stringify(s.participantIds), JSON.stringify(s.stats));
      return json(res, 200, { ok: true });
    }

    // --- food logs ---
    if (req.method === 'GET' && path === '/api/food') {
      const date = url.searchParams.get('date');
      const rows = q.foodForUsersOnDate.all(me.id, me.partnerId || me.id, date);
      return json(res, 200, rows.map(foodRow));
    }

    if (req.method === 'POST' && path === '/api/food') {
      const { photo, description, date } = await readBody(req);
      if (!photo && !description?.trim()) return json(res, 400, { error: 'photo or description required' });
      const photoUrl = photo ? await savePhoto(photo) : null;
      const photoPath = photoUrl ? join(dataDir, 'photos', photoUrl.split('/').pop()) : null;
      const macros = await analyzeFood(photoPath, description);
      const entry = {
        id: randomUUID(), userId: me.id, date, createdAt: new Date().toISOString(),
        description: description || '', photoUrl: photoUrl ?? undefined,
        calories: macros?.calories ?? null, protein: macros?.protein ?? null,
        carbs: macros?.carbs ?? null, fat: macros?.fat ?? null,
        confidence: macros?.confidence ?? null,
        notes: macros ? macros.notes : 'Analysis failed — edit macros manually.',
      };
      q.insertFood.run(entry.id, entry.userId, entry.date, entry.createdAt, entry.description,
        photoUrl, entry.calories, entry.protein, entry.carbs, entry.fat, entry.confidence, entry.notes);
      broadcast('food');
      return json(res, 200, foodRow(q.foodById.get(entry.id)));
    }

    if ((req.method === 'PATCH' || req.method === 'DELETE') && path.startsWith('/api/food/')) {
      const id = path.split('/').pop();
      const existing = q.foodById.get(id);
      if (!existing) return json(res, 404, { error: 'not found' });
      if (existing.userId !== me.id) return json(res, 403, { error: 'forbidden' });
      if (req.method === 'DELETE') {
        q.deleteFood.run(id);
        if (existing.photoUrl) unlink(join(dataDir, 'photos', existing.photoUrl.split('/').pop())).catch(() => {});
      } else {
        const body = await readBody(req);
        const allowed = ['description', 'calories', 'protein', 'carbs', 'fat', 'notes'];
        const fields = Object.entries(body).filter(([k]) => allowed.includes(k));
        if (fields.length) {
          db.prepare(`UPDATE food_logs SET ${fields.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`)
            .run(...fields.map(([, v]) => v), id);
        }
      }
      broadcast('food');
      return json(res, 200, foodRow(q.foodById.get(id)) ?? { ok: true });
    }

    return json(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(req.method, path, e.message);
    return json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => console.log(`SweatEquity server on http://localhost:${PORT} (data: ${dataDir})`));
