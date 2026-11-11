# Main game client

`world-client.mjs` consumes the approved game API; `world-contract.mjs` validates and strips the public view. Neither imports the engine, stores progress in the browser, creates a pretend signed-in player, or falls back to local gameplay.

```js
const game = createWorldGameClient({ onChange: renderCommittedState });
await game.refresh();
// Explicit player input only:
await game.begin();          // allowed only for confirmed new_run
await game.act(action.id);   // action must be offered by the latest server view
```

`ready` is the only playable state. `saving` can display the previous committed view while input is locked; do not animate or report a successful result before the next verified revision. `conflict` requires `refresh()`. `clear()` removes in-memory authorization and invalidates pending results on page/session teardown.

Bind the main Phaser scene, mission list and journal to this one controller. Current production API routes are unmounted; connecting now fails closed as unavailable. The bounded integration world's layout/content is not the final main-game scene. See [delivery scope and next features](../docs/MAIN_GAME_DELIVERY.md).
