# Handoff

## State
DreamingCrownfall (~/Projekte/MarbleCrownfall/dreamingcrownfall) released 0.8.0 (planned Rebellions, src/mlf/king/rebellion-plan.js), 0.9.0 (game layout complete: More/M chips, Dailies button claims all, quest dots, Player gifts + Music in Esc, "Auto-claim dailies"), 0.9.1 (background-tab fix: main.js startPlanWatch lifts throttling 60 s before slot, kicks window.__dcfPlanKick). All on GitHub + Arch repo. Test instance (DCF_PROFILE ...-Test, ports 9333/9334) may still be running; test plans deleted.

## Next
1. CookingSum to retest planned Rebellion with the account tab in the background on 0.9.1; first real (non-intercepted) purchase still unconfirmed — check Schedule list says "started" and only one Rebellion bought.
2. MCF game v0.10.7d added "authored cosmetics" (/api/inventory/authored-equipment/<sha256>.json, 11 modules); only infra, nothing to build until a shop offer has `authoredEquipment` (optional gamewatch alert offered, not commissioned).

## Context
- Buy tests ONLY with CDP Fetch interception (scratchpad t/buytest.js, t/fake.js pattern); game's "Rebellion started." is overwritten instantly → verdict via GET /api/rebellions/me.
- Background-tab tests only after ≥6 min hidden (fresh tabs aren't throttled).
- Luce wants How to Play/Credits/Terms NOT in Esc menu. Memory: dcf-geplante-rebellionen.md.
