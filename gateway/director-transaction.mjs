// Server-only adapter: integrate these callbacks with Ascension v4 Director and a
// durable transactional store. Never use a process-local lock as production authority.
import { GameRequestError } from './game-authority.mjs';
const fail=(status,code)=>{throw new GameRequestError(status,code)};
const ident=x=>typeof x==='string' && /^[A-Za-z0-9:_-]{1,160}$/.test(x);
export function createDirectorTransaction({store,director,entitlements,clock=()=>Date.now()}){
  if(typeof store?.transaction!=='function'||typeof director?.executeChoice!=='function'||
     typeof director?.allowedChoices!=='function'||typeof entitlements?.canAccessChapter!=='function')
    throw new Error('Durable transaction, canonical Director, and entitlement policy required');
  return Object.freeze({
    async loadOwnedRun(identity,runId){
      if(!ident(identity?.subject))fail(401,'authentication_required');
      const run=await store.readOwned(identity.subject,runId);
      return run||null;
    },
    async executeChoice(identity,run,input){
      if(!ident(identity?.subject)||!ident(run?.id)||!ident(input?.sessionId))fail(422,'invalid_game_request');
      if(run.id!==input.sessionId)fail(403,'run_mismatch');
      // transaction must lock the owned row or use compare-and-swap semantics.
      return store.transaction(async tx=>{
        const current=await tx.readOwnedForUpdate(identity.subject,run.id);
        if(!current)fail(404,'run_not_found');
        if(current.revision!==input.expectedRevision)fail(409,'stale_revision');
        if(current.active!==true)fail(403,'run_inactive');
        if(current.currentStoryletId!==input.storyletId)fail(409,'storylet_changed');
        const choices=await director.allowedChoices(current);
        if(!Array.isArray(choices)||!choices.some(c=>c.id===input.choiceId))fail(422,'choice_not_allowed');
        const chapter=current.chapterId;
        if(!await entitlements.canAccessChapter(identity,chapter,current))fail(403,'chapter_access_denied');
        const outcome=await director.executeChoice(current,{storyletId:input.storyletId,choiceId:input.choiceId});
        if(!outcome?.nextState)fail(503,'director_execution_failed');
        const nextChapter=outcome.chapterId??chapter;
        // A free-chapter action cannot bypass a premium boundary by transitioning
        // into protected content. Validate the destination before durable commit.
        if(!await entitlements.canAccessChapter(identity,nextChapter,current))
          fail(403,'destination_chapter_access_denied');
        if(!ident(outcome.nextStoryletId)||!ident(nextChapter))
          fail(503,'invalid_director_transition');
        const next={...current,state:outcome.nextState,currentStoryletId:outcome.nextStoryletId,
          chapterId:nextChapter,revision:current.revision+1,updatedAt:clock()};
        await tx.writeOwned(identity.subject,current.revision,next);
        return next;
      });
    }
  });
}
