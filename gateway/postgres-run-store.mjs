// PostgreSQL-backed, owner-scoped run persistence. Server-only.
// Requires an already-configured pg Pool; no DB credentials live in this module.
// Migration must be explicitly applied by deployment tooling, never at startup.
export const RUNS_MIGRATION = `
CREATE TABLE IF NOT EXISTS ascension_runs (
  id TEXT PRIMARY KEY,
  owner_subject TEXT NOT NULL,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  current_storylet_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ascension_runs_owner_active_idx
  ON ascension_runs(owner_subject, active, updated_at DESC);
`;
const valid = value => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,160}$/.test(value);
function map(row) {
  if (!row) return null;
  const revision=Number(row.revision);
  if (!Number.isSafeInteger(revision)) throw new Error('Stored revision outside safe integer range');
  return {id:row.id,owner:row.owner_subject,revision,active:row.active,
    currentStoryletId:row.current_storylet_id,chapterId:row.chapter_id,
    state:row.state,updatedAt:row.updated_at};
}
export function createPostgresRunStore(pool) {
  if (typeof pool?.connect !== 'function' || typeof pool?.query !== 'function')
    throw new TypeError('Postgres pool required');
  return Object.freeze({
    async readOwned(owner,id=null) {
      if (!valid(owner) || (id!==null && !valid(id))) throw new TypeError('Invalid owner or run ID');
      const statement=id
        ? ['SELECT * FROM ascension_runs WHERE owner_subject=$1 AND id=$2',[owner,id]]
        : ['SELECT * FROM ascension_runs WHERE owner_subject=$1 AND active=TRUE ORDER BY updated_at DESC,id DESC LIMIT 1',[owner]];
      const rows=await pool.query(...statement);
      return map(rows.rows[0]);
    },
    async transaction(fn) {
      const client=await pool.connect();
      let started=false;
      try {
        await client.query('BEGIN');started=true;
        const tx=Object.freeze({
          async readOwnedForUpdate(owner,id) {
            if (!valid(owner)||!valid(id)) throw new TypeError('Invalid owned-run lookup');
            const result=await client.query(
              'SELECT * FROM ascension_runs WHERE owner_subject=$1 AND id=$2 FOR UPDATE',[owner,id]);
            return map(result.rows[0]);
          },
          async writeOwned(owner,expectedRevision,next) {
            if (!valid(owner)||!valid(next?.id)||!valid(next.currentStoryletId)||
                !valid(next.chapterId)||!Number.isSafeInteger(expectedRevision)||
                next.revision!==expectedRevision+1)
              throw new TypeError('Invalid committed game revision');
            const result=await client.query(
              `UPDATE ascension_runs SET revision=$4, active=$5, current_storylet_id=$6,
                 chapter_id=$7, state=$8::jsonb, updated_at=now()
                 WHERE owner_subject=$1 AND id=$2 AND revision=$3 RETURNING id`,
              [owner,next.id,expectedRevision,next.revision,next.active===true,
                next.currentStoryletId,next.chapterId,JSON.stringify(next.state)]);
            if (result.rowCount!==1) throw new Error('Owned run compare-and-swap rejected');
          }
        });
        const result=await fn(tx);
        await client.query('COMMIT');started=false;
        return result;
      } catch(error) {
        if(started) {try{await client.query('ROLLBACK')}catch{/* preserve original error */}}
        throw error;
      } finally {client.release()}
    }
  });
}
