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
    //
    // ---- tile participation: no automatic choice when your marble is caught ----------------------------------
    // At every catch of your own marble the game's tab sends the direction set in it (left by default) on its own,
    // as soon as its local copy of the run reaches the catch. That is before the server gets there, so this default
    // always arrives first and beats any choice that is calculated or sent from somewhere else. As long as you have
    // not picked a direction yourself in this run (request revision 0), the tab now keeps that default back: the
    // request goes out as a plain state poll, and the server applies its own fallback or the choice it got from
    // elsewhere. A direction you pick yourself (revision 1 and up) goes out exactly as before.
    // The tab keeps resending a request until it has a receipt for it, so it gets a local one with the status
    // PF_WITHHELD. Only the patched receive() knows that status and drops it; the commitment the server then
    // confirms is taken over by the commit() fix above, whatever it is. Withholding starts only once both patches
    // are in place, so an unpatched controller never sees the local receipt.
    const PF_WITHHELD = 'dcf_withheld';
    const pfPw = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
    const pfNativeFetch = pfPw.fetch;
    let pfWithhold = false;
    if (typeof pfNativeFetch === 'function') pfPw.fetch = function (input, init) {
        if (!pfWithhold || !init || typeof init.body !== 'string' || init.body.indexOf('player_capture_choice.v2') < 0) return pfNativeFetch.apply(this, arguments);
        let url, body;
        try {
            url = new URL(typeof input === 'string' ? input : String((input && input.url) || ''), pfPw.location.href);
            body = JSON.parse(init.body);
        } catch (e) { return pfNativeFetch.apply(this, arguments); }
        const req = body && body.action === 'input' ? body.input : null;
        if (url.origin !== pfPw.location.origin || url.pathname !== '/api/participation' || !req ||
            req.kind !== 'player_capture_choice.v2' || req.revision !== 0 || !req.requestId) return pfNativeFetch.apply(this, arguments);
        const poll = Object.assign({}, body, { action: 'state' });
        delete poll.input;
        return pfNativeFetch.call(this, input, Object.assign({}, init, { body: JSON.stringify(poll) })).then(res => {
            if (!res.ok) return res;
            return res.clone().json().then(data => {
                if (!data || typeof data !== 'object' || data.error) return res;
                data.receipts = (Array.isArray(data.receipts) ? data.receipts : [])
                    .concat([{ kind: 'player_input_receipt.v2', requestId: req.requestId, encounterId: req.encounterId, status: PF_WITHHELD }]);
                return new pfPw.Response(JSON.stringify(data), { status: res.status, statusText: res.statusText,
                    headers: { 'content-type': 'application/json' } });
            }).catch(() => res);
        });
    };
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
        if (typeof proto.receive === 'function' && !proto.receive.__dcfWithheld) {
            const receiveOriginal = proto.receive;
            const receive = function (receipt) {
                if (receipt && receipt.status === PF_WITHHELD) return;   // our own receipt for a request we kept back
                return receiveOriginal.call(this, receipt);
            };
            receive.__dcfWithheld = true;
            proto.receive = receive;
            pfWithhold = true;
        }
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
