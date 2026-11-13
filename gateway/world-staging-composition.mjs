// Staging-only composition of the current native Account bridge and authored
// Office/Hallway game. Constructing a handler does NOT mount or start any server,
// create capability grants, provision storage, or enable protected production routes.
// The deployment owner must approve exact native session, grants, origins and pool.
import {createWorldCapabilityAuthorizer} from './world-capability-policy.mjs';
import {createOwnerWorldInteractionStore} from './owner-world-interaction-store.mjs';
import {createWorldGameHandler} from './world-game-handler.mjs';

export function createPreparedWorldGameHandler({adapter,pool,capabilityNames,appOrigin,uiOrigin}={}){
 const authorizeWorld=createWorldCapabilityAuthorizer({adapter,capabilityNames});
 const store=createOwnerWorldInteractionStore({pool,authorizeWorld});
 return createWorldGameHandler({adapter,store,appOrigin,uiOrigin});
}
