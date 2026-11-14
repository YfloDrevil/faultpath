# FaultPath
Professional step-by-step field diagnostics. Offline, no guessed wiring.

This MVP is an installable web app for iPhone Safari and Android Chrome: one complete emergency fire-pump click/no-crank flow, safety confirmations, global STOP, local observations and JSON export. No account, server database, AI API or runtime CDN.

## Exact files
- `index.html`: app shell
- `src/app.js`: mobile UI, safety gate, local persistence, export
- `src/engine.js`: deterministic flow transitions
- `src/style.css`: responsive layout
- `data/fire-pump.json`: versioned diagnostic pack, provenance, unknowns and branches
- `sw.js`: complete offline shell/data cache
- `manifest.webmanifest`, `icon.svg`: install metadata
- `tests/flow.test.js`: Node built-in checks
- `docs/BUILD-SESSION.md`: phone-only implementation and acceptance checklist
- `docs/DATA-MODEL.md`: offline contract and test-value policy
- `package.json`: zero-dependency test and local-server commands

## Run
`npm test` (Node 20+). `npm start` (Python 3) serves http://localhost:8080 for local development. For phones, deploy the repository as static files to an HTTPS host, preserving relative paths. No compilation. Do not open index.html through Files/file://; service workers require HTTPS (localhost exception only on that device).

First load needs internet. Wait for **Offline pack ready**, then test airplane mode. Browser storage can be evicted; export records. Safety confirmations reset on reload. This is a prototype diagnostic aid, not fire-system certification or a substitute for approved OEM/site procedures. No machine-specific wiring, battery voltage limits, crank duration or torque values have been established.

## Confirmed historical case
User report, 15 October 2026: repeated flat batteries, clicking/hot starter, charger reported good, engine free by hand, intermittent bench spinning and internal burning; replacing starter restored starting. No measured values were supplied. This history is reference material only and never pre-fills a new case. Recurrent discharge and formal return-to-service testing remain undocumented.

## Validation
Six Node tests cover graph completeness, safety gate, successful route, failed battery route, pending handback and runtime cache inventory. Physical iPhone/Android installation, persistence, export and offline acceptance are still required using the checklist. No native APK/IPA is produced by this slice.
