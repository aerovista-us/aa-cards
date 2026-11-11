# Historical release gate — October 24, 2026

The original October 24 review found an unresolved auth hostname, an unauthenticated legacy run prototype and incomplete game execution. Those were dated observations, not the current service state.

Use [the current release acceptance ledger](RELEASE_ACCEPTANCE.md) and [ACOS #167](https://github.com/aerovista-us/ACOS/issues/167). The auth admission repair and positive browser flow are now recorded; full live Account lifecycle acceptance remains PARTIAL. Main's authored Office/Hallway source has isolated automated acceptance, while production gameplay/map/cloud saves remain disabled and ACOS #126 stays draft.

Do not interpret historical test counts, URLs or DNS failures as current evidence, and do not expose the legacy `/api/runs` prototype as an authenticated game API. Complete recovered-game parity was never certified by the older bounded ports.
