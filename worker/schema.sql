CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- Google account id (sub)
  email TEXT, name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS crossings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  junction_type TEXT, junction_words TEXT,
  length INTEGER NOT NULL,        -- 3, 7, 21 or 40
  start_date TEXT NOT NULL, return_date TEXT,
  status TEXT DEFAULT 'active',   -- active | returned | abandoned
  intention TEXT, outcome_answer TEXT, outcome_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS evenings (
  id TEXT PRIMARY KEY,
  crossing_id TEXT NOT NULL REFERENCES crossings(id),
  n INTEGER NOT NULL, movement TEXT NOT NULL,
  offered TEXT,                   -- JSON array of the three card ids shown
  picked TEXT, question TEXT, entry TEXT, reader_line TEXT, weather TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (crossing_id, n)
);
CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  crossing_id TEXT NOT NULL REFERENCES crossings(id),
  week INTEGER NOT NULL, text TEXT, question TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_crossings_user ON crossings(user_id);
CREATE TABLE IF NOT EXISTS anon_usage (
  ip TEXT NOT NULL, day TEXT NOT NULL, count INTEGER DEFAULT 0,
  PRIMARY KEY (ip, day)
);
CREATE TABLE IF NOT EXISTS reader_errors (
  at TEXT DEFAULT (datetime('now')), detail TEXT
);
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  crossing_id TEXT NOT NULL REFERENCES crossings(id),
  kind TEXT NOT NULL,             -- start | week | return
  week INTEGER,
  steadiness INTEGER, clarity INTEGER, hope INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_checkins_crossing ON checkins(crossing_id);
