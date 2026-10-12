# Ascension Awaits — Cards Frame

Isolated, mobile-first **visual preview** for Ascension Awaits cards and Soul Case File.

This build uses synthetic demonstration choices. **It is not a playable game**, does not access the original Ascension backend, and does not save player progress. The canonical engine and integration work remain in the existing Ascension repository (`feature/game-frame-v1`).

## GitHub Pages

The root `index.html` and `js/game-frame/adapter.js` are static and work directly from the Pages site. Nothing requires Node, Cloudflare credentials, or runtime secrets. Configure Pages from the `main` branch at `/ (root)`.

## Integration path

Once game-frame browser acceptance is complete, port the presentation components while retaining the real Ascension state/Director/save authority. Do not expose private saves or API endpoints via static hosting.
