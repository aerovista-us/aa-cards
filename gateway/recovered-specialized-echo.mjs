// Exact recovered Ascension v4 queueLongTermEcho implementation transplanted
// from js/app.js; source-specific branches stay canonical.
// UI event logging is intentionally omitted; RNG and state are server-owned.
const NPC_TAGS=['jinx','edgar','caseworker','nyx','gatekeeper','master-weaver','pathfinder','forge-master','grand-weaver','nettie','timbr'];
class RecoveredEchoAuthority {
 constructor(state,rng){this.state={state,rand:()=>rng.next()}}
 ensureStoryState(){const s=this.state.state;s.storyMemory??={};s.storyMemory.pendingEchoes??=[]}
 getNpcTagFromStorylet(storylet){return NPC_TAGS.find(tag=>(storylet?.tags||[]).includes(tag))||null}
 logEvent(_message){}
  queueLongTermEcho(storylet, choice, outcome, before, after){
    if(!storylet || !choice) return;
    if(String(storylet.id || '').startsWith('echo.')) return;

    this.ensureStoryState();
    const s = this.state.state;
    const pending = s.storyMemory.pendingEchoes || [];
    if(pending.length >= 24) return;

    const tags = storylet.tags || [];
    const npcTag = this.getNpcTagFromStorylet(storylet);
    if(tags.includes('repeatable') && !npcTag) return;
    const delay = 2 + Math.floor(this.state.rand() * 3);
    const dueTurn = Number(s.turn || 0) + delay;
    const choiceId = choice?.id || 'choice';
    const choiceLabel = choice?.label || choiceId;
    const unresolvedDuplicate = pending.some((echo) =>
      !echo.resolved &&
      echo.sourceStoryletId === storylet.id &&
      echo.sourceChoiceId === choiceId
    );
    if(unresolvedDuplicate) return;

    const drift = {
      council: (after?.council || 0) - (before?.council || 0),
      exiles: (after?.exiles || 0) - (before?.exiles || 0),
      timeline: (after?.timeline || 0) - (before?.timeline || 0),
      humanity: (after?.humanity || 0) - (before?.humanity || 0),
    };

    let payload = null;

    if(storylet.id === 'office.intake_briefing'){
      const stanceNotes = {
        acknowledge: 'your cooperative intake signature',
        pushback: 'your challenge to office procedure',
        watch_rolodex: 'your unauthorized Rolodex observation',
      };
      payload = {
        world: 'AFTERLIFE',
        dueTurn: Number(s.turn || 0) + 3,
        tags: ['echo', 'onboarding', 'caseworker', 'story'],
        label: 'Echo Notice: Window 7B Reopens Your File',
        text: `A carbon-copy memo cites ${stanceNotes[choiceId] || choiceLabel} and slides back under Billy's packet with one field now marked REVIEW.`,
        choices: [
          {
            id: 'secure_records',
            label: 'Spend goodwill to unlock one restricted record',
            effects: {
              'npcs.caseworker': '+1',
              'storyMemory.npcMemory.caseworkerSuspicion': '-1',
              'inventory.Clue': '+1',
              'flags.caseworkerThreadTone': 'aligned',
            },
          },
          {
            id: 'ask_missing_names',
            label: 'Ask which names vanished from the queue board',
            effects: {
              'consequences.humanity': '+1',
              'npcs.caseworker': '+1',
              'flags.caseworkerThreadTone': 'doubt',
            },
          },
        ],
      };
    }

    if(storylet.id === 'office.choice_point_memory_or_present'){
      const memoryRoute = choiceId === 'memory_route';
      payload = {
        world: memoryRoute ? 'ARCHIVE' : 'BLACK_MARKET',
        dueTurn: Number(s.turn || 0) + 2,
        tags: ['echo', 'main', 'route', memoryRoute ? 'memory' : 'market'],
        label: memoryRoute ? 'Route Echo: The Archive Answers First' : 'Route Echo: The Market Prices Your Name',
        text: memoryRoute
          ? 'A Memory Keeper marks Billy\'s file with a retrieval order and asks which version of the truth he intends to protect.'
          : 'The Present Board posts Billy\'s name under active contracts and asks what he is willing to trade to stay alive now.',
        choices: memoryRoute
          ? [
              {
                id: 'protect_sequence',
                label: 'Protect the true sequence before using it',
                effects: {
                  'consequences.humanity': '+1',
                  'consequences.keepers': '+1',
                  'inventory.Memory Key': '+1',
                  'flags.routeEchoResolved': 'memory_protected'
                }
              },
              {
                id: 'extract_leverage',
                label: 'Extract leverage from the memory before it fades',
                effects: {
                  'consequences.timeline': '+1',
                  'inventory.Clue': '+1',
                  'flags.routeEchoResolved': 'memory_leverage'
                }
              }
            ]
          : [
              {
                id: 'secure_passage',
                label: 'Secure protected passage through market terms',
                effects: {
                  'consequences.council': '+1',
                  'inventory.Favor': '+1',
                  'flags.routeEchoResolved': 'present_protected'
                }
              },
              {
                id: 'split_contract',
                label: 'Split the contract through Exile runners',
                effects: {
                  'consequences.exiles': '+1',
                  'inventory.Clue': '+1',
                  'flags.routeEchoResolved': 'present_split'
                }
              }
            ]
      };
    }

    if(!payload && npcTag === 'jinx'){
      const supportive = ['follow', 'reassure', 'shared_goal', 'trust_jinx', 'guidance', 'synchronize'].includes(choiceId);
      payload = {
        world: ['VEILWAY', 'ODDWYN'].includes(s.currentWorld) ? s.currentWorld : 'VEILWAY',
        tags: ['echo', 'npc', 'jinx', 'conversation'],
        label: 'Echo Notice: Jinx Reopens The Compass Line',
        text: `Jinx drags a chalk arc over your old route and asks whether ${choiceLabel} was courage or camouflage.`,
        choices: supportive
          ? [
              {
                id: 'hold_line',
                label: 'Co-sign the route and keep the pact intact',
                effects: {
                  'npcs.jinx': '+1',
                  'storyMemory.npcMemory.jinxTrust': '+1',
                  'consequences.humanity': '+1',
                  'flags.jinxTrustMode': 'trust'
                }
              },
              {
                id: 'reframe',
                label: 'Reclassify the route under verification only',
                effects: {
                  'npcs.jinx': '-1',
                  'storyMemory.npcMemory.jinxTrust': '-1',
                  'consequences.timeline': '+1',
                  'flags.jinxTrustMode': 'audit'
                }
              }
            ]
          : [
              {
                id: 'soften',
                label: 'Lower your guard and invite a true partnership',
                effects: {
                  'npcs.jinx': '+1',
                  'storyMemory.npcMemory.jinxTrust': '+1',
                  'consequences.humanity': '+1',
                  'flags.jinxTrustMode': 'trust'
                }
              },
              {
                id: 'double_down',
                label: 'Escalate doubt and treat every mark as bait',
                effects: {
                  'npcs.jinx': '-1',
                  'storyMemory.npcMemory.jinxTrust': '-1',
                  'consequences.keepers': '+1',
                  'flags.jinxTrustMode': 'audit'
                }
              }
            ]
      };
    }

    if(!payload && npcTag === 'edgar'){
      const debtHeavy = Number(s.storyMemory?.npcMemory?.edgarDebt || 0) > 0 || choiceId === 'refuse';
      payload = {
        world: ['BLACK_MARKET', 'ARCHIVE'].includes(s.currentWorld) ? s.currentWorld : 'BLACK_MARKET',
        tags: ['echo', 'npc', 'edgar', 'debt'],
        label: 'Echo Ledger: Edgar Calls In Quiet Interest',
        text: `A folded invoice resurfaces your ${choiceLabel} move and stamps it with interest due before next bell.`,
        choices: debtHeavy
          ? [
              {
                id: 'settle_debt',
                label: 'Pay a partial installment for one verified lead',
                effects: {
                  'npcs.edgar': '+1',
                  'storyMemory.npcMemory.edgarDebt': '-1',
                  'inventory.Clue': '+1',
                  'flags.edgarThreadTone': 'transactional'
                }
              },
              {
                id: 'double_down',
                label: 'Refuse again and absorb market retaliation',
                effects: {
                  'npcs.edgar': '-1',
                  'storyMemory.npcMemory.edgarDebt': '+1',
                  'heat': '+1',
                  'consequences.timeline': '+1',
                  'flags.edgarThreadTone': 'hostile'
                }
              }
            ]
          : [
              {
                id: 'ask_receipt',
                label: 'Demand receipt plus chain-of-custody proof',
                effects: {
                  'inventory.Scripted Note': '+1',
                  'npcs.edgar': '+1',
                  'flags.edgarThreadTone': 'transactional'
                }
              },
              {
                id: 'ask_memory_cost',
                label: 'Ask which memory was displaced as payment',
                effects: {
                  'consequences.humanity': '+1',
                  'npcs.edgar': '+1',
                  'flags.edgarThreadTone': 'personal'
                }
              }
            ]
      };
    }

    if(!payload && npcTag === 'caseworker'){
      const aligned = ['comply', 'formal_prompt', 'ask_name', 'testify', 'clean_lane'].includes(choiceId);
      payload = {
        world: 'AFTERLIFE',
        tags: ['echo', 'npc', 'caseworker', 'bureaucracy'],
        label: 'Echo Notice: Window 7B Reopens Your File',
        text: `A carbon-copy memo cites ${choiceLabel} and requests immediate clarification under intake code.`,
        choices: aligned
          ? [
              {
                id: 'secure_records',
                label: 'Spend goodwill to unlock one restricted record',
                effects: {
                  'npcs.caseworker': '+1',
                  'storyMemory.npcMemory.caseworkerSuspicion': '-1',
                  'inventory.Clue': '+1',
                  'flags.caseworkerThreadTone': 'aligned'
                }
              },
              {
                id: 'ask_missing_names',
                label: 'Spend goodwill for missing-souls disclosure',
                effects: {
                  'consequences.humanity': '+1',
                  'npcs.caseworker': '+1',
                  'flags.caseworkerThreadTone': 'doubt'
                }
              }
            ]
          : [
              {
                id: 'admit_exploit',
                label: 'Admit the exploit and negotiate formal terms',
                effects: {
                  'npcs.caseworker': '+1',
                  'storyMemory.npcMemory.caseworkerSuspicion': '-1',
                  'flags.caseworkerThreadTone': 'doubt'
                }
              },
              {
                id: 'forge_again',
                label: 'Forge deeper and force the process to comply',
                effects: {
                  'npcs.caseworker': '-1',
                  'storyMemory.npcMemory.caseworkerSuspicion': '+1',
                  'consequences.council': '+1',
                  'consequences.timeline': '+1',
                  'flags.caseworkerThreadTone': 'hostile'
                }
              }
            ]
      };
    }

    if(npcTag === 'nyx'){
      const openStance = ['stand_ground', 'answer_back', 'release', 'offer_name', 'break_cycle'].includes(choiceId);
      payload = {
        world: ['RIFT', 'VEILWAY', 'BLACK_MARKET'].includes(s.currentWorld) ? s.currentWorld : 'RIFT',
        tags: ['echo', 'npc', 'nyx', 'threat'],
        label: 'Echo Hunt: Nyx Returns To The Unanswered Line',
        text: `Nyx repeats the posture behind ${choiceLabel} and waits to see whether you bargain, bleed, or run.`,
        choices: openStance
          ? [
              {
                id: 'offer_name',
                label: 'Offer one true name tied to the hunt',
                effects: {
                  'npcs.nyx': '+1',
                  'storyMemory.npcMemory.nyxPressure': '-1',
                  'consequences.humanity': '+1',
                  'flags.nyxThreadTone': 'respect'
                }
              },
              {
                id: 'tighten_hunt',
                label: 'Turn the opening into tactical leverage',
                effects: {
                  'npcs.nyx': '-1',
                  'storyMemory.npcMemory.nyxPressure': '+1',
                  'consequences.timeline': '+1',
                  'flags.nyxThreadTone': 'predatory'
                }
              }
            ]
          : [
              {
                id: 'reopen_dialogue',
                label: 'Reopen dialogue from a safer distance',
                effects: {
                  'npcs.nyx': '+1',
                  'storyMemory.npcMemory.nyxPressure': '-1',
                  'flags.nyxThreadTone': 'respect'
                }
              },
              {
                id: 'keep_running',
                label: 'Keep running and sever every signal line',
                effects: {
                  'npcs.nyx': '-1',
                  'storyMemory.npcMemory.nyxPressure': '+1',
                  'heat': '+1',
                  'flags.nyxThreadTone': 'predatory'
                }
              }
            ]
      };
    }

    if(!payload){
      const driftMagnitude = Math.abs(drift.council) + Math.abs(drift.exiles) + Math.abs(drift.timeline) + Math.abs(drift.humanity);
      const threadHeavy = tags.includes('main') || tags.includes('puzzle') || tags.includes('sidequest');
      if(!threadHeavy && driftMagnitude <= 0) return;

      payload = {
        world: s.currentWorld,
        tags: ['echo', 'environment', 'story'],
        label: 'Echo Rebound: Corridor Memory Audit',
        text: `The hallway restages ${choiceLabel} with one impossible detail altered, as if testing your story for weak seams.`,
        choices: [
          {
            id: 'stabilize',
            label: 'Stabilize the seam and keep moving',
            effects: {
              'consequences.timeline': '-1',
              'consequences.humanity': '+1',
              'heat': '-1'
            }
          },
          {
            id: 'exploit_rebound',
            label: 'Exploit the rebound for short-term leverage',
            effects: {
              'consequences.timeline': '+1',
              'consequences.council': '+1',
              'heat': '+1'
            }
          }
        ]
      };
    }

    const echo = {
      id: `echo.${String(storylet.id || 'unknown').replace(/[^a-zA-Z0-9_.-]/g, '_')}.${String(choiceId).replace(/[^a-zA-Z0-9_.-]/g, '_')}.${s.turn || 0}.${Math.floor(this.state.rand() * 99999)}`,
      dueTurn: Number(payload.dueTurn || dueTurn),
      announced: false,
      resolved: false,
      world: payload.world || null,
      sourceStoryletId: storylet.id || 'unknown',
      sourceChoiceId: choiceId,
      sourceLabel: storylet.label || storylet.id || 'previous encounter',
      sourceChoiceLabel: choiceLabel,
      label: payload.label,
      text: payload.text,
      tags: payload.tags || ['echo'],
      choices: payload.choices || []
    };

    pending.push(echo);
    s.storyMemory.pendingEchoes = pending.slice(-24);
    const turnsUntilEcho = Math.max(1, Number(echo.dueTurn || dueTurn) - Number(s.turn || 0));
    this.logEvent(`Delayed consequence queued. Review window opens in ${turnsUntilEcho} turns.`);
  }


}
export function queueCanonicalRecoveredEcho(state,storylet,choice,outcome,before,after,rng){
 if(!rng||typeof rng.next!=='function')throw new TypeError('Server-owned RNG required');
 const prior=(state.storyMemory?.pendingEchoes||[]).length;
 new RecoveredEchoAuthority(state,rng).queueLongTermEcho(storylet,choice,outcome,before,after);
 return (state.storyMemory?.pendingEchoes||[]).length>prior?state.storyMemory.pendingEchoes.at(-1):null;
}
