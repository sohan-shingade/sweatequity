// SQLite storage via node:sqlite (built into Node 22+, zero deps).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = process.env.SWEAT_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(join(DATA_DIR, 'photos'), { recursive: true });

export const dataDir = DATA_DIR;
export const db = new DatabaseSync(join(DATA_DIR, 'sweatequity.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    goalDays INTEGER NOT NULL DEFAULT 0,
    pairingCode TEXT NOT NULL,
    partnerId TEXT,
    wagerAmount INTEGER NOT NULL DEFAULT 0,
    lastResetDate TEXT
  );
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    activity TEXT NOT NULL,
    subType TEXT,
    durationMinutes INTEGER NOT NULL DEFAULT 0,
    photoUrl TEXT,
    verified INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    weekStarting TEXT NOT NULL,
    weekEnding TEXT NOT NULL,
    participantIds TEXT NOT NULL, -- JSON array
    stats TEXT NOT NULL           -- JSON object
  );
  CREATE TABLE IF NOT EXISTS food_logs (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    photoUrl TEXT,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    confidence TEXT,
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(userId, date);
  CREATE INDEX IF NOT EXISTS idx_food_user ON food_logs(userId, date);
`);

// --- row <-> app-shape helpers ---

export const userRow = (r) => r && ({
  id: r.id, email: r.email, name: r.name, avatar: r.avatar,
  goalDays: r.goalDays, pairingCode: r.pairingCode,
  partnerId: r.partnerId ?? null, wagerAmount: r.wagerAmount,
  lastResetDate: r.lastResetDate ?? undefined,
});

export const logRow = (r) => r && ({
  id: r.id, userId: r.userId, date: r.date, activity: r.activity,
  subType: r.subType ?? null, durationMinutes: r.durationMinutes,
  photoUrl: r.photoUrl ?? undefined, verified: !!r.verified,
});

export const summaryRow = (r) => r && ({
  id: r.id, weekStarting: r.weekStarting, weekEnding: r.weekEnding,
  participantIds: JSON.parse(r.participantIds), stats: JSON.parse(r.stats),
});

export const foodRow = (r) => r && ({
  id: r.id, userId: r.userId, date: r.date, createdAt: r.createdAt,
  description: r.description, photoUrl: r.photoUrl ?? undefined,
  calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat,
  confidence: r.confidence ?? undefined, notes: r.notes ?? undefined,
});
