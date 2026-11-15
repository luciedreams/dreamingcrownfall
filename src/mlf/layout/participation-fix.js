    // ---- tile participation: accept the choice the server confirmed ------------------------------
    // Chicken Out, Spider Rush & co.: when your marble is caught, this tab sends your set direction on its
    // own. The game's controller (PlayerDeliveryControllerV2, _shared/participation/playerDeliveryClientV2.js)
    // assumes the confirmed choice is always the one it sent. If the server confirms a different one,
    // commit() throws v2_wrong_accepted_choice. The server repeats that commitment with every reply until the run
    // ends, so every poll fails again, and the lane hangs until F5.
    //
    // The fix takes the commitment as it is: the server has decided, and the tab follows. Everything else
    // commit() checks (contact, a commitment that changes afterwards) still throws as before. A dynamic
    // import of the same URL returns the same module instance the game uses, so patching the prototype
    // also covers controllers that already exist. If the module is renamed in an update, nothing happens.
    let pfDone = false, pfUrl = '';
    function pfModuleUrl() {
        const res = performance.getEntriesByType('resource').find(r => /\/_shared\/participation\/playerDeliveryClientV2\.js(\?|$)/.test(r.name));
        if (res) return res.name;
        const app = [...document.querySelectorAll('script[type="module"][src]')].find(s => /\/immutable-assets\/[^/]+\/app\.js(\?|$)/.test(s.src));
        return app ? app.src.replace(/app\.js(\?.*)?$/, '_shared/participation/playerDeliveryClientV2.js') : '';
    }
    function pfPatch(mod) {
        const C = mod && mod.PlayerDeliveryControllerV2;
        const proto = C && C.prototype;
        if (!proto || typeof proto.commit !== 'function' || proto.commit.__dcfForeignChoice) return;
        const original = proto.commit;
        const commit = function (commitment) {
            try {
                return original.call(this, commitment);
            } catch (err) {
                const msg = String(err && err.message || err);
                const capture = commitment && commitment.encounter && this.captures instanceof Map
                    ? this.captures.get(commitment.encounter.encounterId) : null;
                if (!capture || !/v2_wrong_accepted_choice|v2_accepted_fallback_conflict/.test(msg)) throw err;
                capture.commitment = structuredClone(commitment);
            }
        };
        commit.__dcfForeignChoice = true;
        proto.commit = commit;
        pfDone = true;
    }
    function pfTry() {
        if (pfDone) return;
        const url = pfModuleUrl();
        if (!url || url === pfUrl) return;
        pfUrl = url;
        import(url).then(pfPatch).catch(() => { pfUrl = ''; });
    }
    pfTry();
    const pfTimer = setInterval(() => { pfTry(); if (pfDone) clearInterval(pfTimer); }, 2000);
