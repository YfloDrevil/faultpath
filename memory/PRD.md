# FaultPath PRD
**Last Updated:** 2025-02-14

## Original Problem Statement
Restore and rebuild the "FaultPath" diagnostic assistant for mechanics/technicians with:
- AI-powered diagnostic chat with detailed vehicle/equipment intake.
- Quick Diagnostics multiple-choice flows.
- Reference Diagrams (visual schematics) and Technical Reference (text guides).
- Fuel-aware logic (diesel vs petrol) and support for heavy equipment brands.
- Offline/PWA support.

## Users & Personas
- Mechanics and technicians diagnosing vehicles/heavy equipment.
- Fleet owners/operators who need quick troubleshooting guidance.

## Core Requirements (Static)
- React frontend + FastAPI backend + MongoDB.
- AI chat for diagnostics (LLM integration).
- Quick Diagnostics flows with branching logic.
- Separate visual diagrams and text-based references.
- Offline capability via PWA.

## Architecture
- Frontend: React (CRA + Tailwind).
- Backend: FastAPI (single server.py) + Motor (MongoDB).
- APIs: /api/conversations, /api/conversations/{id}/messages, /api/diagnostic-flows, /api/diagrams.

## Current Status (as of this update)
- App rebuilt with AI chat, Quick Diagnostics, Technical Reference, and PWA scaffolding.
- Deployment hardcoded LLM fallback removed.

## Known Issues / Gaps
- AI chat blocked when Emergent LLM key budget is exceeded.
- Reference Diagrams section empty (needs visual content).
- Quick Diagnostics not fully brand/equipment-specific.
- Deployment readiness: DB_NAME injection and supervisor config required by deploy layer.

## Prioritized Backlog
### P0
- Restore AI chat (user to provide OpenAI key or top-up Emergent Universal Key).

### P1
- Brand/equipment-specific diagnostic branching.
- Populate Reference Diagrams with real schematics/images.

### P2
- Test offline/PWA caching flows.
- Refactor backend into smaller modules.

## Next Action Items
- Confirm AI key approach (top-up vs OpenAI key).
- Decide diagram sources to populate.
- Provide priority brands/equipment for diagnostic tailoring.