# Offline JSON contract (v1)

Pack: `schemaVersion`, stable `id`, numeric `revision`, `title`, `scope`, `unknowns[]`, `sources[]`, `safety[]`, `stopText`, `start` and `nodes{}`. A node has `title`, `instruction`, `terminal` and `choices[{label,next}]`. IDs are explicit; no generated diagnoses. All choice targets must exist; terminals have no choices. Any new pack revision must increment the service-worker cache version too.

Session: `schemaVersion`, `flowId`, `revision`, `node`, `confirmed`, `notes{nodeId:text}`, `history[{node,choice,at}]`, `createdAt`. Export adds `exportedAt`. Stored/exported confirmation is always false; every reload requires fresh safety confirmation. Revision mismatch starts a fresh case; export before upgrades. Notes deliberately remain free text in this slice; no numeric auto-diagnosis. Record units, loaded/rested conditions, test equipment, terminal identity, source and measured result.

## Values and wiring policy

| Test | Value / acceptance | Source / condition |
| --- | --- | --- |
| Rated supply | 12 or 24 V class, positively identify actual machine | Rating/diagram; unknown is STOP |
| Each battery rested/loaded voltage | Record V; no universal pass threshold supplied | Chemistry/rating/temperature-specific manufacturer test |
| Main positive and return drop | Record both V and total under comparable load | Generic Delco cranking reference total **<0.5 V**; use applicable OEM limit; do not apply universally to 24 V |
| Starter command voltage | Record V and terminal ID against OEM range | Wiring pins/colours and required voltage UNKNOWN |
| Starter current, torque, crank duty cycle, charger voltage | UNKNOWN; obtain applicable OEM limits | No guessed amperage, seconds, torque or charging setpoint |
| Engine rotation | Normal / abnormal / unverified | OEM barring method with energy isolated |
| Starter assessment | Workshop report and correct part identification | No unsafe DIY bench-test procedure |

Generic source: https://www.delcoremy.com/the-latest/2014/march/tech-tip-diagnosing-starter-cranking-problems . It supports battery-first and cable-drop screening, not this pump's OEM specifications. A small drop with no load does not prove a cable good. Source text is bundled for offline use; links need internet.

## Full primary route
Safety → symptom → batteries → cable drop → command → free engine → qualified starter assessment → repair → acceptance/handback. Every failed/unknown branch terminates with correction, escalation or STOP. Global STOP is available throughout; New case resets it. No historical observations are treated as current evidence. Starting after replacement is separate from formal acceptance and investigation of recurrent discharge.

## Limits
No authentication, encrypted records, attachments, structured numerical validation, automatic cloud sync, native binary or service certification. Browser notes may contain sensitive identifiers: keep records minimal and export securely. Safety ticks attest to technician actions; software cannot verify physical isolation. Old case data remains on the device until overwritten/cleared.
