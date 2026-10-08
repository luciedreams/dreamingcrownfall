    // =========================================================================================
    // EMOJI — DreamingCrownfall
    // =========================================================================================
    // Three ways to the standard emoji in the game chat, each on its own switch (Settings › Chat):
    //   - typed smileys become emoji as they are finished: ":) " -> "🙂 " (chatEmoticons);
    //   - a colon and the start of a name opens suggestions, ":name:" written out is replaced
    //     (chatEmojiSuggest);
    //   - a smiley button beside the message box opens every emoji with search, categories, the
    //     last used ones and skin tones (chatEmojiButton).
    // What is sent is plain Unicode, so everybody sees the emoji, in the browser too. The data
    // (chat/emoji-data.js) is generated from emojibase. Works in the game's field and in the
    // growing box (9h); a change is announced with an input event, as @+Tab does.
    const DCF_EMOJI_GROUPS = [
        ['Smileys & emotion', '😀'], ['People & body', '👋'], null, ['Animals & nature', '🐻'], ['Food & drink', '🍔'],
        ['Travel & places', '✈️'], ['Activities', '⚽'], ['Objects', '💡'], ['Symbols', '💜'], ['Flags', '🏳️'],
    ];
    const DCF_EMO_RECENT_KEY = 'dcf_emoji_recent';
    const DCF_EMO_TONE_KEY = 'dcf_emoji_tone';
    const DCF_EMO_RECENT_MAX = 32;
    const DCF_EMO_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Twemoji Mozilla", sans-serif';

    // Classic smileys. Only replaced when they stand on their own (start or space before, space
    // or end after), so "http://", "10:30" or "a:b" are never touched.
    const DCF_EMOTICONS = {
        ':)': '🙂', ':-)': '🙂', '(:': '🙂', ':]': '🙂', '=)': '🙂',
        ':D': '😄', ':-D': '😄', '=D': '😄', 'xD': '😆', 'XD': '😆',
        ';)': '😉', ';-)': '😉', ';D': '😜',
        ':(': '🙁', ':-(': '🙁', '):': '🙁', ":'(": '😢', ":'-(": '😢', 'D:': '😧',
        ':P': '😛', ':p': '😛', ':-P': '😛', ':-p': '😛', ';P': '😜', ';p': '😜', 'xP': '😝', 'XP': '😝',
        ':O': '😮', ':o': '😮', ':-O': '😮', ':-o': '😮',
        ':|': '😐', ':-|': '😐', ':/': '😕', ':-/': '😕', ':\\': '😕',
        ':*': '😘', ':-*': '😘', 'B)': '😎', 'B-)': '😎', '>:(': '😠', '>:)': '😈', 'O:)': '😇', 'o:)': '😇',
        '<3': '❤️', '</3': '💔', ":')": '🥲', '^^': '😊', '^_^': '😊', '-_-': '😑', 'T_T': '😭', ';_;': '😭', 'o/': '👋', '\\o/': '🙌',
    };

    let dcfEmoIndex = null;   // { list: [{e, name, group, codes, words, skins}], byCode: Map }
    function dcfEmo() {
        if (dcfEmoIndex) return dcfEmoIndex;
        const list = DCF_EMOJI.map(([e, name, group, codes, words, skins]) => ({
            e, name, group, codes: codes ? codes.split(' ') : [], words: (name + ' ' + words + ' ' + codes).toLowerCase(), skins: skins || null,
        }));
        const byCode = new Map();
        for (const x of list) for (const c of x.codes) if (!byCode.has(c)) byCode.set(c, x);
        dcfEmoIndex = { list, byCode };
        return dcfEmoIndex;
    }
    const dcfTone = () => { try { const t = Number(localStorage.getItem(DCF_EMO_TONE_KEY)); return t >= 1 && t <= 5 ? t : 0; } catch (e) { return 0; } };
    const dcfWithTone = x => (x.skins && dcfTone() ? x.skins[dcfTone() - 1] : x.e);
    function dcfRecent() { try { return JSON.parse(localStorage.getItem(DCF_EMO_RECENT_KEY)) || []; } catch (e) { return []; } }
    function dcfRemember(e) {
        try {
            const r = [e, ...dcfRecent().filter(x => x !== e)].slice(0, DCF_EMO_RECENT_MAX);
            localStorage.setItem(DCF_EMO_RECENT_KEY, JSON.stringify(r));
        } catch (err) {}
    }

    // Search, best first: a shortcode that is exactly the word, then shortcodes and names that
    // start with it (shorter first — ":fir" finds :fire: before :firefighter:), then anything
    // whose name or search words contain every word.
    function dcfEmoSearch(q, max = 60) {
        const words = q.toLowerCase().replace(/^:|:$/g, '').split(/[\s_]+/).filter(Boolean);
        if (!words.length) return [];
        const first = words.join('_');
        const scored = [];
        for (const x of dcfEmo().list) {
            if (!words.every(w => x.words.includes(w))) continue;
            let score = 3;
            if (x.codes.includes(first)) score = 0;
            else {
                const hit = x.codes.filter(c => c.startsWith(first)).sort((a, b) => a.length - b.length)[0];
                if (hit) score = 1 + hit.length / 100;
                else if (x.name.toLowerCase().startsWith(words[0])) score = 2 + x.name.length / 100;
            }
            scored.push([score, x]);
        }
        return scored.sort((a, b) => a[0] - b[0]).slice(0, max).map(s => s[1]);
    }

    // ---- the chat field ---------------------------------------------------------------------
    function dcfEmoField(t) {
        return t && t.closest && t.closest('.mcf-chat__form') && t.matches('[data-role="chat-input"], textarea.mcfo-chatgrow') ? t : null;
    }
    function dcfCurrentField() {
        const form = chatRoot() && chatRoot().querySelector('[data-role="chat-form"]');
        if (!form) return null;
        return form.querySelector('textarea.mcfo-chatgrow') || form.querySelector('[data-role="chat-input"]');
    }
    function dcfSetField(el, value, caret) {
        const max = el.maxLength > 0 ? el.maxLength : 280;
        if (value.length > max) return false;
        el.value = value;
        try { el.setSelectionRange(caret, caret); } catch (e) {}
        try { el.dispatchEvent(new pageWindow.Event('input', { bubbles: true })); }
        catch (err) { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e2) {} }
        return true;
    }
    // Replaces text[start, end) with s and puts the caret after it.
    function dcfSplice(el, start, end, s) {
        return dcfSetField(el, el.value.slice(0, start) + s + el.value.slice(end), start + s.length);
    }

    // Smiley or :code: right before the caret, followed by what was just typed (a space, or
    // nothing): the caret ends up after that again.
    function dcfReplaceBehind(el, typed) {
        const caret = el.selectionStart;
        const before = el.value.slice(0, caret - typed.length);
        const swap = (start, s) => dcfSetField(el, el.value.slice(0, start) + s + el.value.slice(before.length),
                                               start + s.length + typed.length);
        if (settings.chatEmojiSuggest) {
            const m = before.match(/(^|\s):([a-z0-9_+\-]{1,40}):$/i);
            const x = m && dcfEmo().byCode.get(m[2].toLowerCase());
            if (x) {
                const start = before.length - m[2].length - 2;
                dcfRemember(x.e);
                return swap(start, dcfWithTone(x));
            }
        }
        if (settings.chatEmoticons) {
            const m = before.match(/(^|\s)(\S{2,4})$/);
            const e = m && DCF_EMOTICONS[m[2]];
            if (e) return swap(before.length - m[2].length, e);
        }
        return false;
    }

    document.addEventListener('input', e => {
        const el = dcfEmoField(e.target);
        if (!el || !e.isTrusted) return;
        const typed = e.data || '';
        // A finished word: space, or the closing colon of :code:.
        if (typed === ' ' || (typed === ':' && settings.chatEmojiSuggest)) {
            if (typed === ':') dcfReplaceBehind(el, '');
            else dcfReplaceBehind(el, ' ');
        }
        dcfSuggestUpdate(el);
    }, true);

    document.addEventListener('keydown', e => {
        const el = dcfEmoField(e.target);
        if (!el) return;
        if (dcfSug && dcfSug.el === el && dcfSug.items.length) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault(); e.stopPropagation();
                dcfSug.i = (dcfSug.i + (e.key === 'ArrowDown' ? 1 : dcfSug.items.length - 1)) % dcfSug.items.length;
                dcfSuggestDraw();
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); dcfSuggestPick(dcfSug.i); return; }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dcfSuggestClose(); return; }
        }
        // Sending: a smiley at the very end has no space after it, finish it first.
        if (e.key === 'Enter' && !e.shiftKey) dcfReplaceBehind(el, '');
    }, true);
    document.addEventListener('focusout', e => { if (dcfEmoField(e.target)) setTimeout(() => { if (!dcfEmoField(document.activeElement)) dcfSuggestClose(); }, 150); }, true);

    // ---- suggestions after a colon ------------------------------------------------------------
    let dcfSug = null;   // { el, box, items, i, start, end }
    function dcfSuggestUpdate(el) {
        if (!settings.chatEmojiSuggest) return dcfSuggestClose();
        const caret = el.selectionStart;
        const m = el.value.slice(0, caret).match(/(^|\s):([a-z0-9_+\-]{2,30})$/i);
        if (!m) return dcfSuggestClose();
        const items = dcfEmoSearch(m[2], 8);
        if (!items.length) return dcfSuggestClose();
        if (!dcfSug) {
            dcfEmojiStyles();
            const box = document.createElement('div');
            box.className = 'dcf-emo-sug';
            box.setAttribute('role', 'listbox');
            document.body.appendChild(box);
            dcfSug = { box };
        }
        Object.assign(dcfSug, { el, items, i: 0, q: m[2].toLowerCase(), start: caret - m[2].length - 1, end: caret });
        dcfSuggestDraw();
    }
    function dcfSuggestDraw() {
        const { box, items, i, el } = dcfSug;
        box.replaceChildren(...items.map((x, n) => {
            const row = document.createElement('div');
            row.className = 'dcf-emo-sug__row';
            row.setAttribute('role', 'option');
            row.setAttribute('aria-selected', n === i ? 'true' : 'false');
            row.innerHTML = '<span class="dcf-emo-sug__e"></span><span class="dcf-emo-sug__code"></span><span class="dcf-emo-sug__name"></span>';
            row.children[0].textContent = dcfWithTone(x);
            // The shortcode that matches what was typed (":thumbs" shows :thumbsup:, not :+1:).
            const code = x.codes.find(c => c.startsWith(dcfSug.q)) || x.codes[0] || x.name.replace(/\s+/g, '_');
            row.children[1].textContent = ':' + code + ':';
            row.children[2].textContent = x.name;
            row.addEventListener('mousedown', ev => { ev.preventDefault(); dcfSuggestPick(n); });
            return row;
        }));
        const form = el.closest('.mcf-chat__form') || el;
        const r = form.getBoundingClientRect();
        box.style.left = Math.max(8, r.left) + 'px';
        box.style.width = Math.max(240, Math.min(360, r.width)) + 'px';
        box.style.bottom = (innerHeight - r.top + 6) + 'px';
    }
    function dcfSuggestPick(n) {
        if (!dcfSug) return;
        const x = dcfSug.items[n];
        const { el, start, end } = dcfSug;
        dcfSuggestClose();
        if (!x) return;
        dcfRemember(x.e);
        const after = /^\s/.test(el.value.slice(end)) ? '' : ' ';
        dcfSplice(el, start, end, dcfWithTone(x) + after);
        el.focus();
    }
    function dcfSuggestClose() {
        if (dcfSug) { dcfSug.box.remove(); dcfSug = null; }
    }

    // ---- the button and the picker ----------------------------------------------------------
    const DCF_EMO_BTN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/></svg>';
    let dcfPick = null;   // { root, anchor, field, caret, onDoc, onKey }

    function drawEmojiButton() {
        const on = !!settings.chatEmojiButton && !signedOut();
        const form = chatRoot() && chatRoot().querySelector('[data-role="chat-form"]');
        const send = form && form.querySelector('[data-role="chat-send"], .mcf-chat__send');
        let btn = document.querySelector('.dcf-emoji-btn');
        if (!on) { if (btn) btn.remove(); return; }
        if (!form || !send) return;
        dcfEmojiStyles();
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dcf-emoji-btn';
            btn.title = 'Emoji';
            btn.setAttribute('aria-label', 'Emoji');
            btn.innerHTML = DCF_EMO_BTN_ICON;
            btn.addEventListener('mousedown', e => {
                // Remember where the caret was before the button takes the focus.
                const f = dcfCurrentField();
                btn._caret = f ? [f, f.selectionStart, f.selectionEnd] : null;
            });
            btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); dcfPick ? dcfPickClose() : dcfPickOpen(btn); });
        }
        // Leftmost of our chat buttons: before the paw, else the tomato, else Send.
        const next = form.querySelector(':scope > .mcfo-animal-btn') || form.querySelector(':scope > .mcfo-tomato-btn') || send;
        if (btn.nextElementSibling !== next) form.insertBefore(btn, next);   // type="button": never submits
    }

    function dcfPickInsert(x) {
        const f = (dcfPick && dcfPick.field && dcfPick.field.isConnected) ? dcfPick.field : dcfCurrentField();
        if (!f || f.disabled || f.readOnly) return;
        const start = dcfPick && dcfPick.field === f ? dcfPick.start : f.value.length;
        const end = dcfPick && dcfPick.field === f ? dcfPick.end : f.value.length;
        const s = dcfWithTone(x);
        if (!dcfSplice(f, start, end, s)) return;
        dcfRemember(x.e);
        if (dcfPick) { dcfPick.field = f; dcfPick.start = dcfPick.end = start + s.length; }
    }

    function dcfPickOpen(anchor) {
        dcfEmojiStyles();
        const saved = anchor._caret;
        const field = saved && saved[0] && saved[0].isConnected ? saved[0] : dcfCurrentField();
        const root = document.createElement('div');
        root.className = 'dcf-emo';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', 'Emoji');
        root.innerHTML = '<div class="dcf-emo__top"><input type="search" class="dcf-emo__search" placeholder="Search emoji…" aria-label="Search emoji"></div>'
            + '<div class="dcf-emo__tabs" role="tablist"></div>'
            + '<div class="dcf-emo__grid" tabindex="-1"></div>'
            + '<div class="dcf-emo__foot"><span class="dcf-emo__big"></span><span class="dcf-emo__info"><b></b><small></small></span><span class="dcf-emo__tones" aria-label="Skin tone"></span></div>';
        document.body.appendChild(root);
        dcfPick = { root, anchor, field, start: saved ? saved[1] : (field ? field.value.length : 0), end: saved ? saved[2] : (field ? field.value.length : 0) };

        const search = root.querySelector('.dcf-emo__search');
        const grid = root.querySelector('.dcf-emo__grid');
        const tabs = root.querySelector('.dcf-emo__tabs');
        const big = root.querySelector('.dcf-emo__big');
        const infoName = root.querySelector('.dcf-emo__info b');
        const infoCode = root.querySelector('.dcf-emo__info small');
        const hover = x => {
            big.textContent = x ? dcfWithTone(x) : '';
            infoName.textContent = x ? x.name : 'Pick an emoji';
            infoCode.textContent = x && x.codes[0] ? ':' + x.codes[0] + ':' : '';
        };
        const cell = x => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'dcf-emo__e';
            b.textContent = dcfWithTone(x);
            b.title = x.name;
            b.addEventListener('mouseenter', () => hover(x));
            b.addEventListener('focus', () => hover(x));
            b.addEventListener('click', () => dcfPickInsert(x));
            return b;
        };
        const section = (title, items, id) => {
            const sec = document.createElement('section');
            sec.className = 'dcf-emo__sec';
            if (id != null) sec.dataset.group = id;
            const h = document.createElement('div');
            h.className = 'dcf-emo__h';
            h.textContent = title;
            const g = document.createElement('div');
            g.className = 'dcf-emo__cells';
            g.append(...items.map(cell));
            sec.append(h, g);
            return sec;
        };
        const draw = () => {
            const q = search.value.trim();
            const parts = [];
            if (q) {
                const found = dcfEmoSearch(q, 400);
                parts.push(found.length ? section(`Results for "${q}"`, found) : Object.assign(document.createElement('div'), { className: 'dcf-emo__none', textContent: 'No emoji found.' }));
            } else {
                const byE = new Map(dcfEmo().list.map(x => [x.e, x]));
                const recent = dcfRecent().map(e => byE.get(e)).filter(Boolean);
                if (recent.length) parts.push(section('Recently used', recent, 'recent'));
                DCF_EMOJI_GROUPS.forEach((g, i) => { if (g) parts.push(section(g[0], dcfEmo().list.filter(x => x.group === i), i)); });
            }
            grid.replaceChildren(...parts);
            tabs.toggleAttribute('hidden', !!q);
            hover(null);
        };
        // Tabs: last used and one per group; a click scrolls to it.
        const tabBtn = (label, icon, target) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'dcf-emo__tab';
            b.textContent = icon;
            b.title = label;
            b.addEventListener('click', () => { const s = grid.querySelector(`[data-group="${target}"]`); if (s) grid.scrollTop = s.offsetTop - grid.offsetTop; });
            return b;
        };
        tabs.append(tabBtn('Recently used', '🕘', 'recent'), ...DCF_EMOJI_GROUPS.map((g, i) => g && tabBtn(g[0], g[1], i)).filter(Boolean));
        // Skin tones for the people emoji.
        const tones = root.querySelector('.dcf-emo__tones');
        ['✋', '✋🏻', '✋🏼', '✋🏽', '✋🏾', '✋🏿'].forEach((t, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'dcf-emo__tone';
            b.textContent = t;
            b.title = ['Default', 'Light', 'Medium-light', 'Medium', 'Medium-dark', 'Dark'][i] + ' skin tone';
            b.setAttribute('aria-pressed', dcfTone() === i ? 'true' : 'false');
            b.addEventListener('click', () => {
                try { localStorage.setItem(DCF_EMO_TONE_KEY, String(i)); } catch (e) {}
                for (const x of tones.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
                draw();
            });
            tones.appendChild(b);
        });
        let typing = 0;
        search.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(draw, 80); });
        search.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); const first = grid.querySelector('.dcf-emo__e'); if (first) first.click(); }
        });
        draw();

        // Above the button, right edges lined up; inside the window.
        const r = anchor.getBoundingClientRect();
        const w = Math.min(372, innerWidth - 16);
        root.style.width = w + 'px';
        root.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
        root.style.bottom = Math.max(8, innerHeight - r.top + 8) + 'px';
        search.focus({ preventScroll: true });

        const onDoc = e => { if (!root.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) dcfPickClose(); };
        const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dcfPickClose(true); } };
        document.addEventListener('mousedown', onDoc, true);
        document.addEventListener('keydown', onKey, true);
        Object.assign(dcfPick, { onDoc, onKey });
    }

    function dcfPickClose(refocus) {
        if (!dcfPick) return;
        const { root, onDoc, onKey, field, end } = dcfPick;
        document.removeEventListener('mousedown', onDoc, true);
        document.removeEventListener('keydown', onKey, true);
        root.remove();
        dcfPick = null;
        if (refocus && field && field.isConnected) { field.focus(); try { field.setSelectionRange(end, end); } catch (e) {} }
    }

    function dcfEmojiStyles() {
        if (document.getElementById('dcf-emo-css')) return;
        const s = document.createElement('style');
        s.id = 'dcf-emo-css';
        s.textContent = `
            /* The form is the game's grid; with our button it gets one more auto column. */
            html .mcf-chat__form:has(> .dcf-emoji-btn) { grid-template-columns: minmax(0, 1fr) !important; grid-auto-flow: column; grid-auto-columns: auto; }
            .dcf-emoji-btn {
                align-self: stretch; width: 38px; min-height: 30px; padding: 0; box-sizing: border-box; display: grid; place-items: center;
                border: 1px solid #4a3a66; border-radius: 7px; background: #1d1530; color: #d9c6f5; cursor: pointer;
            }
            .dcf-emoji-btn:hover { border-color: #b48ae8; background: #2a1f44; color: #fff; }
            .dcf-emoji-btn svg { width: 18px; height: 18px; }
            html[data-mcfo-chatgrow="1"] .mcf-chat__form:has(.mcfo-chatgrow) > .dcf-emoji-btn { align-self: end; height: var(--mcfo-chatgrow-line, auto); }

            .dcf-emo, .dcf-emo-sug {
                --de-bg: #1b1429; --de-line: rgba(180, 138, 232, 0.25); --de-text: #ece4f7; --de-muted: #a99cc0; --de-violet: #b48ae8; --de-gold: #ffd36e;
                position: fixed; z-index: 2147482800; color: var(--de-text); font-family: inherit;
                background: linear-gradient(180deg, #241938, var(--de-bg)); border: 1px solid var(--de-line); border-radius: 14px;
                box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
            }
            .dcf-emo { display: flex; flex-direction: column; height: min(420px, 70vh); overflow: hidden; animation: dcf-emo-rise 140ms ease-out; }
            .dcf-emo__top { padding: 10px 10px 6px; }
            .dcf-emo__search {
                width: 100%; box-sizing: border-box; padding: 8px 10px; font: inherit; font-size: 13.5px; color: var(--de-text);
                background: rgba(0, 0, 0, 0.3); border: 1px solid var(--de-line); border-radius: 9px; outline: none;
            }
            .dcf-emo__search:focus { border-color: var(--de-violet); }
            .dcf-emo__tabs { display: flex; gap: 2px; padding: 0 8px 6px; border-bottom: 1px solid rgba(180, 138, 232, 0.14); }
            .dcf-emo__tabs[hidden] { display: none; }
            .dcf-emo__tab { flex: 1; padding: 5px 0; font-family: ${DCF_EMO_FONT}; font-size: 17px; line-height: 1; background: none; border: 0; border-radius: 7px; cursor: pointer; filter: grayscale(0.4); opacity: 0.75; }
            .dcf-emo__tab:hover { background: rgba(180, 138, 232, 0.14); filter: none; opacity: 1; }
            .dcf-emo__grid { flex: 1; overflow: auto; padding: 4px 8px 8px; scrollbar-width: thin; scrollbar-color: rgba(180, 138, 232, 0.4) transparent; }
            .dcf-emo__sec { content-visibility: auto; contain-intrinsic-size: auto 300px; }
            .dcf-emo__h { position: sticky; top: 0; z-index: 1; padding: 8px 4px 5px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--de-gold); background: var(--de-bg); }
            .dcf-emo__cells { display: grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); }
            .dcf-emo__e { height: 36px; padding: 0; font-family: ${DCF_EMO_FONT}; font-size: 22px; line-height: 1; background: none; border: 0; border-radius: 8px; cursor: pointer; }
            .dcf-emo__e:hover, .dcf-emo__e:focus-visible { background: rgba(180, 138, 232, 0.2); outline: none; }
            .dcf-emo__none { padding: 30px 10px; text-align: center; color: var(--de-muted); font-size: 13px; }
            .dcf-emo__foot { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-top: 1px solid rgba(180, 138, 232, 0.14); background: rgba(10, 7, 18, 0.35); min-height: 40px; }
            .dcf-emo__big { width: 30px; font-family: ${DCF_EMO_FONT}; font-size: 26px; line-height: 1; text-align: center; }
            .dcf-emo__info { flex: 1; min-width: 0; display: grid; }
            .dcf-emo__info b { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .dcf-emo__info small { font-size: 11.5px; color: var(--de-muted); }
            .dcf-emo__tones { display: flex; gap: 1px; }
            .dcf-emo__tone { width: 24px; height: 24px; padding: 0; font-family: ${DCF_EMO_FONT}; font-size: 15px; background: none; border: 1px solid transparent; border-radius: 6px; cursor: pointer; }
            .dcf-emo__tone[aria-pressed="true"] { border-color: var(--de-violet); background: rgba(180, 138, 232, 0.18); }

            .dcf-emo-sug { padding: 5px; max-height: 300px; overflow: auto; }
            .dcf-emo-sug__row { display: grid; grid-template-columns: 28px auto minmax(0, 1fr); align-items: center; gap: 8px; padding: 5px 8px; border-radius: 8px; cursor: pointer; }
            .dcf-emo-sug__row[aria-selected="true"] { background: rgba(180, 138, 232, 0.22); }
            .dcf-emo-sug__e { font-family: ${DCF_EMO_FONT}; font-size: 20px; line-height: 1; text-align: center; }
            .dcf-emo-sug__code { font-size: 13px; font-weight: 700; }
            .dcf-emo-sug__name { font-size: 12px; color: var(--de-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            @keyframes dcf-emo-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
            @media (prefers-reduced-motion: reduce) { .dcf-emo { animation: none; } }`;
        (document.head || document.documentElement).appendChild(s);
    }

