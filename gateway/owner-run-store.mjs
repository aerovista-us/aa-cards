// Server-only owner-bound persistence adapter for the canonical Director.
// Requires PostgreSQL schema; intentionally does not implement game rules.
export function createOwnerRunStore({pool, executeCanonicalChoice, authorizeChapter}) {
  if (!pool?.connect || typeof executeCanonicalChoice !== 'function' ||
      typeof authorizeChapter !== 'function') throw new Error('Required server authorities unavailable');
  const assertId = x => typeof x === 'string' && /^[a-zA-Z0-9:_-]{1,160}$/.test(x);
  async function commitChoice(identity, runId, input) {
    if (!assertId(identity?.subject)) throw Object.assign(new Error('authentication_required'),{status:401});
    if (!assertId(runId) || !assertId(input?.choiceId) || !((typeof input?.storyletId === 'string') && /^[a-zA-Z0-9:_.-]{1,160}$/.test(input.storyletId)) ||
        !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
      throw Object.assign(new Error('invalid_choice'),{status:422});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const result=await client.query('SELECT id,owner_subject,revision,state FROM ascension_player_runs WHERE id=$1 FOR UPDATE',[runId]);
      const run=result.rows[0];
      if (!run || run.owner_subject !== identity.subject) throw Object.assign(new Error('not_found'),{status:404});
      if (run.revision !== input.expectedRevision) throw Object.assign(new Error('stale_revision'),{status:409});
      if (await authorizeChapter(identity,run.state,input,client)!==true) throw Object.assign(new Error('chapter_denied'),{status:403});
      const next=await executeCanonicalChoice(structuredClone(run.state),input,{identity,client});
      if (!next || typeof next !== 'object' || Array.isArray(next)) throw Object.assign(new Error('choice_rejected'),{status:422});
      const saved=await client.query('UPDATE ascension_player_runs SET state=$1::jsonb,revision=revision+1,updated_at=NOW() WHERE id=$2 AND owner_subject=$3 AND revision=$4 RETURNING id,revision,state',
        [JSON.stringify(next),runId,identity.subject,run.revision]);
      if (saved.rows.length!==1) throw Object.assign(new Error('stale_revision'),{status:409});
      await client.query('COMMIT');
      return saved.rows[0];
    } catch(error) {await client.query('ROLLBACK');throw error} finally {client.release()}
  }
  async function loadOwnedRun(identity,runId) {
    if (!assertId(identity?.subject)) throw Object.assign(new Error('authentication_required'),{status:401});
    if (runId !== null && !assertId(runId)) throw Object.assign(new Error('invalid_run'),{status:422});
    const result=runId
      ? await pool.query('SELECT id,revision,state FROM ascension_player_runs WHERE owner_subject=$1 AND id=$2',[identity.subject,runId])
      : await pool.query('SELECT id,revision,state FROM ascension_player_runs WHERE owner_subject=$1 ORDER BY updated_at DESC LIMIT 1',[identity.subject]);
    return result.rows[0] ?? null;
  }
  return Object.freeze({commitChoice,loadOwnedRun});
}
