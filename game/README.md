# Connected main-game candidate

`index.html` presents the connected 9×7 Afterlife Office and Hallway through `main.mjs` and `office-scene.mjs`. It is a development candidate on the draft feature branch, not an activated production game. See [delivery scope](../docs/MAIN_GAME_DELIVERY.md).

`world-client.mjs` is the only gameplay controller; `world-contract.mjs` validates/strips the public v3 view. Phaser and `office-navigation.mjs` use public geometry and offered actions only. They do not import the engine, simulate outcomes, create a signed-in player, store progress locally or fall back to demo gameplay.

Controls: arrows/WASD or directional buttons move; click/tap a walkable tile to submit a sequence of confirmed moves; E focuses nearby actions; Escape cancels navigation. The expandable accessible map provides equivalent buttons. Reduce motion removes movement tweens/Glitch camera effects. The case panel shows saved assessment, inventory, placement, Glitch heat and Hallway checkpoint; the mission and journal reflect committed events.

`ready` is playable. `saving` retains only the prior committed view and locks input. Movement animates after the verified revision returns. `conflict` requires reload; session failures clear the scene. Page/session teardown clears in-memory authorization and invalidates pending results.

For isolated acceptance, CI serves `/game/` on loopback with disposable PostgreSQL and synthetic identity; run `scripts/office-browser-accept.mjs` only with its explicitly guarded configuration. Static hosting alone supplies no server. A loopback fixture may inject a validated API origin through the `ascension-api-origin` HTML meta tag to reproduce separate UI/API origins; the client still permits only loopback HTTP or the fixed auth host. On non-loopback hosts the client targets the fixed Ascension auth origin; current production game API routes are unmounted, so it fails closed as unavailable. Do not add a local fake-state fallback or mount the candidate against production to make it playable.

Completed intake offers `Enter the Hallway` at the Placement Door. The server selects assistance or scrutiny from the saved Glitch outcome. Return at the Office Door preserves checkpoint progress; the assigned destination door ends this increment. Save schema 3 explicitly upgrades valid prior schema-2 Office saves without a reset; malformed/unsupported saves remain unavailable.
