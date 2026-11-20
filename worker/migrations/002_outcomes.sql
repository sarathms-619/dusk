-- Outcome tracking: intention, compass check-ins, evening weather, and the Return answer.
-- Run once on databases created before this migration. Fresh installs get these from schema.sql.
ALTER TABLE crossings ADD COLUMN intention TEXT;
ALTER TABLE crossings ADD COLUMN outcome_answer TEXT;
ALTER TABLE crossings ADD COLUMN outcome_note TEXT;
ALTER TABLE evenings ADD COLUMN weather TEXT;
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  crossing_id TEXT NOT NULL REFERENCES crossings(id),
  kind TEXT NOT NULL,             -- start | week | return
  week INTEGER,
  steadiness INTEGER, clarity INTEGER, hope INTEGER,   -- each 1 to 10
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_checkins_crossing ON checkins(crossing_id);
