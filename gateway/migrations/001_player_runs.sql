-- Run only in an isolated PostgreSQL database until canonical migrations are approved.
CREATE TABLE IF NOT EXISTS ascension_player_runs (
  id text PRIMARY KEY,
  owner_subject text NOT NULL,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ascension_run_id CHECK (id ~ '^[A-Za-z0-9:_-]{1,160}$'),
  CONSTRAINT ascension_run_owner CHECK (owner_subject ~ '^[A-Za-z0-9:_-]{1,160}$')
);
CREATE INDEX IF NOT EXISTS ascension_player_runs_owner_recent
  ON ascension_player_runs(owner_subject, updated_at DESC);
