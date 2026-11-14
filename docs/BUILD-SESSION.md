# One build session — iPhone and Android

Target: same HTTPS PWA on both devices. An iPhone alone can edit/deploy through GitHub in Safari; an Android phone is needed to verify Android behaviour. No App Store, Mac or native signing in this slice. Allow roughly 60–90 minutes with an existing static-host account; account/hosting setup can add time.

## Implementation checklist
- [ ] Open the MVP branch/PR in GitHub on iPhone. Review `data/fire-pump.json` and confirm scope is clicking/no-crank conventional starter.
- [ ] Keep machine identity, exact wiring and OEM limits UNKNOWN until verified; use the STOP branches when unavailable. The MVP itself is usable without inventing these.
- [ ] Review code and test results. Merge only after review; the implementation is on a separate branch.
- [ ] In repository Settings → Pages (if available for this account/repository), select the reviewed branch, root folder, Save. Alternatively import this repository to an existing HTTPS static host with no build command and repository root as publish folder. Check account visibility/access policy before enabling hosting; Pages may expose the app publicly.
- [ ] Open the generated HTTPS URL in Safari; wait for **Offline pack ready**. Add to Home Screen using Share → Add to Home Screen. Launch the saved app online once and wait for ready again.
- [ ] On Android, open the same URL in Chrome; wait for ready, then use Add to Home screen / Install (wording varies). Launch saved app once online.

## Acceptance on EACH phone
Use a disposable test case and clearly label observations TEST; do not claim real equipment readings.
- [ ] Leave one safety checkbox unticked: Continue remains disabled. Tick all four: flow opens.
- [ ] Choose a result without observations: it is blocked. Record TEST observations and proceed.
- [ ] Walk primary route: classify option 1 → battery 1 → cables 1 → command 1 → mechanical 1 → starter assessment 1 → repair acceptance 1. Ends at case complete, never before acceptance.
- [ ] Export JSON; confirm file opens and contains notes, chosen outcomes, timestamps, flow revision and no persisted safety confirmation. On iPhone verify Files/Downloads or share destination; export behaviour needs device testing.
- [ ] Close/reopen: notes and position resume, safety must be confirmed again.
- [ ] After ready, enable airplane mode; fully close and reopen installed app. Flow, safety, notes, STOP and export must work. Do not rely only on an already-open tab.
- [ ] New test case: battery fails → terminal battery correction. Another: normal crank → outside scope. Another: repair acceptance incomplete → handback pending.
- [ ] Press global STOP at an intermediate step: no Continue choices appear; current notes/history remain exportable. New case requires explicit reset confirmation and fresh safety checks.
- [ ] Try unknown diagram/limit branch: STOP. No pin assignment or replacement verdict is invented.
- [ ] Clear site data only after export; confirm fresh case and online recache required. If storage is unavailable, use warning and export before closing.

## Local/CI verification
`npm test` uses Node's built-in runner, no package install. Local preview: `npm start`; a desktop localhost URL is not reachable as phone localhost. Phone testing requires HTTPS hosting.

## Completion record
Record tested URL, commit, iOS/Safari and Android/Chrome versions, date and pass/fail for install, cold offline launch, resume, STOP and export. These physical checks were not run by the implementation agent. Do not present this prototype as operationally approved before review and the site's acceptance process.

Single best next step: open the PR, then deploy the reviewed branch to an HTTPS static host and run the cold-launch airplane-mode check on your iPhone.
