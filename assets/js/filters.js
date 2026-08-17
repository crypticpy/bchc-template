// Faceted filtering, sorting, view switching and URL state for the catalog.
//
// DATA-ATTRIBUTE CONTRACT
//   Cards   <li data-entry data-entry-id data-entry-title data-entry-date
//               [data-entry-updated] data-facet-<key>="slug,slug"
//               [data-sort-<key>]>            (_includes/entry-card.html)
//   Grid    <ul data-entry-grid data-view="grid|list">
//   Pills   <button data-filter-key="<key>" data-filter-mode="single|multi"
//               data-filter-value="<slug>" data-filter-label="<value>"
//               aria-pressed>  <span data-filter-count>   (rail AND sheet)
//   Groups  [data-filter-group] > [data-group-toggle][aria-expanded] + [data-group-panel]
//           [data-show-all] reveals the pills marked [data-overflow]
//   Header  [data-filters-config] (data-entry-plural/-singular, data-relevance-label),
//           [data-entry-count], [data-entry-count-label], [data-entry-total],
//           [data-total-wrap], [data-filter-active-pills], [data-filter-clear],
//           [data-sort], [data-view-toggle="grid|list"], [data-filter-status]
//   Empty   [data-empty-state] > [data-empty-cause], [data-empty-filters]
//   Sheet   [data-sheet-open] (+[data-filter-count-badge]), [data-filter-sheet],
//           [data-sheet-close], [data-sheet-apply]
//   Search  [data-filter="search"]; assets/js/search.js owns window.__searchMatches
//           (Set of entry ids or null), window.__searchOrder (ids by relevance) and
//           fires the "catalog:search" event when either changes.
//
// URL: ?<key>=<slug>,<slug>&q=&sort=&view= — pushState on toggles, debounced
// replaceState while typing, restored on load, Back undoes.
(function () {
  const grid = document.querySelector('[data-entry-grid]');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('[data-entry]'));
  const pills = Array.from(document.querySelectorAll('[data-filter-key]'));
  const cfg = document.querySelector('[data-filters-config]');
  const searchInput = document.querySelector('[data-filter="search"]');
  const sortSelect = document.querySelector('[data-sort]');
  const viewButtons = Array.from(document.querySelectorAll('[data-view-toggle]'));
  const activeWraps = Array.from(document.querySelectorAll('[data-filter-active-pills]'));
  const clearButtons = Array.from(document.querySelectorAll('[data-filter-clear]'));
  const statusEl = document.querySelector('[data-filter-status]');
  const emptyState = document.querySelector('[data-empty-state]');
  const emptyCause = document.querySelector('[data-empty-cause]');
  const emptyFilters = document.querySelector('[data-empty-filters]');
  const sheet = document.querySelector('[data-filter-sheet]');
  const sheetOpeners = Array.from(document.querySelectorAll('[data-sheet-open]'));
  const heading = document.getElementById('results-heading');

  const plural = (cfg && cfg.dataset.entryPlural) || 'entries';
  const singular = (cfg && cfg.dataset.entrySingular) || plural.replace(/s$/, '');
  const relevanceLabel = (cfg && cfg.dataset.relevanceLabel) || 'Relevance';

  const keys = Array.from(new Set(pills.map((p) => p.dataset.filterKey)));
  const modes = new Map();
  pills.forEach((p) => modes.set(p.dataset.filterKey, p.dataset.filterMode || 'multi'));

  // key -> Set(slug). Sorting and view are single values.
  const state = new Map();
  let sort = 'newest';
  let sortExplicit = false;
  let view = grid.dataset.view === 'list' ? 'list' : 'grid';
  let appliedOrder = '';

  // Zero-count pills sort last. Doing that with `order` desyncs tab order from the
  // visual order, so they are moved in the DOM instead; data-index remembers where
  // each pill started so the original order can always be rebuilt.
  const pillContainers = new Set();
  pills.forEach((p) => {
    const parent = p.parentElement;
    if (!parent || pillContainers.has(parent)) return;
    pillContainers.add(parent);
    Array.from(parent.children).forEach((el, i) => {
      el.dataset.index = String(i);
    });
  });

  /**
   * Re-sort one pill container's DOM children so zero-count (`.is-empty`)
   * pills trail the rest, restoring each pill's original position (via its
   * `data-index`) among its own kind first. No-ops when already in order, to
   * avoid needless reflow on every render.
   * @param {Element} container a pill's parent element.
   */
  function reorderPills(container) {
    const current = Array.from(container.children);
    const byIndex = current
      .slice()
      .sort((a, b) => Number(a.dataset.index || 0) - Number(b.dataset.index || 0));
    const ordered = byIndex
      .filter((el) => !el.classList.contains('is-empty'))
      .concat(byIndex.filter((el) => el.classList.contains('is-empty')));
    if (ordered.every((el, i) => el === current[i])) return;
    const frag = document.createDocumentFragment();
    ordered.forEach((el) => frag.appendChild(el));
    container.appendChild(frag);
  }

  const facets = cards.map((el) => {
    const map = {};
    keys.forEach((k) => {
      map[k] = new Set(
        (el.getAttribute('data-facet-' + k) || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    });
    return map;
  });

  /* ------------------------------------------------------------------ URL */

  /** Populate `state`, `sort`, `sortExplicit` and `view` from the current URL's query string. */
  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    state.clear();
    keys.forEach((k) => {
      const raw = params.get(k) || params.get(k.replace(/-/g, '_'));
      if (raw)
        state.set(
          k,
          new Set(
            raw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          )
        );
    });
    if (searchInput) searchInput.value = params.get('q') || '';
    sortExplicit = params.has('sort');
    sort = params.get('sort') || 'newest';
    // "Relevance" only exists while there is a query; a bare ?sort=relevance would
    // leave the <select> showing nothing, so fall back to the default order.
    if (sort === 'relevance' && !(searchInput && searchInput.value.trim())) {
      sort = 'newest';
      sortExplicit = false;
    }
    const v = params.get('view');
    view = v === 'list' ? 'list' : 'grid';
  }

  /**
   * Serialize `state`/`sort`/`view` back onto the URL.
   * @param {boolean} push true to push a new history entry (a toggle), false
   *   to replace the current one (debounced typing, so Back doesn't step
   *   through every keystroke).
   */
  function writeUrl(push) {
    const params = new URLSearchParams();
    state.forEach((set, key) => {
      if (set.size) params.set(key, Array.from(set).join(','));
    });
    const q = searchInput ? searchInput.value.trim() : '';
    if (q) params.set('q', q);
    if (sort !== 'newest') params.set('sort', sort);
    if (view !== 'grid') params.set('view', view);
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    if (push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  /* -------------------------------------------------------------- matching */

  function searchOk(i) {
    const set = window.__searchMatches;
    return !(set instanceof Set) || set.has(cards[i].dataset.entryId);
  }

  /**
   * Whether card `i` matches every active facet filter except `exceptKey`.
   * Excluding one key is how the pill counts are computed (a pill's own count
   * must not be narrowed by its own selection).
   * @param {number} i index into `cards`/`facets`.
   * @param {string|null} exceptKey facet key to ignore, or null to check all.
   * @returns {boolean}
   */
  function facetOk(i, exceptKey) {
    for (const [key, set] of state) {
      if (!set.size || key === exceptKey) continue;
      const have = facets[i][key];
      if (!have) return false;
      let hit = false;
      set.forEach((v) => {
        if (have.has(v)) hit = true;
      });
      if (!hit) return false;
    }
    return true;
  }

  function labelFor(key, value) {
    const p = pills.find((x) => x.dataset.filterKey === key && x.dataset.filterValue === value);
    return p ? p.dataset.filterLabel : value;
  }

  function activeList() {
    const out = [];
    state.forEach((set, key) =>
      set.forEach((v) => out.push({ key: key, value: v, label: labelFor(key, v) }))
    );
    return out;
  }

  /* ------------------------------------------------------------- ordering */

  /**
   * Build a card-index comparator for the current `sort` value.
   * @returns {(a: number, b: number) => number} comparator over indices into `cards`.
   */
  function comparator() {
    if (sort === 'az')
      return (a, b) => (cards[a].dataset.entryTitle || '').localeCompare(cards[b].dataset.entryTitle || '');
    if (sort === 'updated') {
      return (a, b) =>
        (cards[b].dataset.entryUpdated || cards[b].dataset.entryDate || '').localeCompare(
          cards[a].dataset.entryUpdated || cards[a].dataset.entryDate || ''
        );
    }
    if (sort === 'relevance') {
      const order = Array.isArray(window.__searchOrder) ? window.__searchOrder : [];
      const rank = (i) => {
        const r = order.indexOf(cards[i].dataset.entryId);
        return r === -1 ? 1e6 : r;
      };
      return (a, b) => rank(a) - rank(b);
    }
    if (sort.indexOf('field:') === 0) {
      const attr = 'data-sort-' + sort.slice(6);
      return (a, b) => (cards[a].getAttribute(attr) || '').localeCompare(cards[b].getAttribute(attr) || '');
    }
    return (a, b) => (cards[b].dataset.entryDate || '').localeCompare(cards[a].dataset.entryDate || '');
  }

  /** Re-append all cards to the grid in `comparator()` order. Skips the DOM write if the order is unchanged. */
  function applyOrder() {
    const idx = cards.map((_, i) => i).sort(comparator());
    const signature = idx.join(',');
    if (signature === appliedOrder) return;
    appliedOrder = signature;
    const frag = document.createDocumentFragment();
    idx.forEach((i) => frag.appendChild(cards[i]));
    grid.appendChild(frag);
  }

  /* --------------------------------------------------------------- render */

  let announceTimer = null;
  /**
   * Debounced live-region update for screen readers: result count plus the
   * active filter/search terms. Debounced so rapid pill clicks don't spam
   * announcements.
   * @param {number} shown cards currently visible.
   * @param {number} total cards on the page.
   */
  function announce(shown, total) {
    if (!statusEl) return;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      const names = activeList().map((a) => a.label);
      const q = searchInput ? searchInput.value.trim() : '';
      if (q) names.push('“' + q + '”');
      statusEl.textContent =
        shown +
        ' of ' +
        total +
        ' ' +
        (shown === 1 ? singular : plural) +
        (names.length ? '. Filters: ' + names.join(', ') + '.' : '.');
    }, 500);
  }

  /**
   * Rebuild the "active filter" remove-pills in every `[data-filter-active-pills]`
   * wrap (there is one in the rail and one in the empty state).
   * @param {Array<{key: string, value: string, label: string}>} active from `activeList()`.
   */
  function renderActivePills(active) {
    const build = (target) => {
      target.textContent = '';
      active.forEach((a) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'active-pill';
        btn.setAttribute('aria-label', 'Remove filter: ' + a.label);
        const text = document.createElement('span');
        text.textContent = a.label;
        btn.appendChild(text);
        const x = document.createElement('span');
        x.setAttribute('aria-hidden', 'true');
        x.textContent = '×';
        btn.appendChild(x);
        btn.addEventListener('click', () => {
          toggleValue(a.key, a.value, true);
        });
        target.appendChild(btn);
      });
    };
    activeWraps.forEach(build);
    if (emptyFilters) build(emptyFilters);
  }

  /**
   * Full re-render: show/hide cards, recompute per-pill live counts, force
   * open any filter group with an active pill, update the count/empty-state
   * text, reorder the grid and sync the sort/view controls. Called after any
   * state change (`update()`) and on `catalog:search`/`popstate`.
   */
  function render() {
    let shown = 0;
    const visible = [];
    cards.forEach((card, i) => {
      const ok = facetOk(i, null) && searchOk(i);
      card.classList.toggle('hidden', !ok);
      if (ok) {
        shown++;
        visible.push(i);
      }
    });

    // Live counts: for each facet, count against everything EXCEPT that facet.
    keys.forEach((key) => {
      const base = [];
      cards.forEach((_, i) => {
        if (facetOk(i, key) && searchOk(i)) base.push(i);
      });
      pills
        .filter((p) => p.dataset.filterKey === key)
        .forEach((p) => {
          const value = p.dataset.filterValue;
          let n = 0;
          base.forEach((i) => {
            if (facets[i][key] && facets[i][key].has(value)) n++;
          });
          const on = (state.get(key) || new Set()).has(value);
          p.setAttribute('aria-pressed', String(on));
          p.classList.toggle('is-active', on);
          p.classList.toggle('is-empty', n === 0 && !on);
          if (n === 0 && !on) p.setAttribute('aria-disabled', 'true');
          else p.removeAttribute('aria-disabled');
          const badge = p.querySelector('[data-filter-count]');
          if (badge) badge.textContent = n ? String(n) : '0';
          if (on && p.hasAttribute('data-overflow')) p.classList.remove('hidden');
        });
    });
    pillContainers.forEach(reorderPills);

    // Any group holding an active filter is forced open.
    document.querySelectorAll('[data-filter-group]').forEach((group) => {
      if (!group.querySelector('.filter-pill.is-active')) return;
      const toggle = group.querySelector('[data-group-toggle]');
      const panel = group.querySelector('[data-group-panel]');
      if (toggle && panel && toggle.getAttribute('aria-expanded') !== 'true') {
        toggle.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
      }
    });

    const total = cards.length;
    document.querySelectorAll('[data-entry-count]').forEach((el) => {
      el.textContent = String(shown);
    });
    document.querySelectorAll('[data-entry-count-label]').forEach((el) => {
      el.textContent = shown === 1 ? singular : plural;
    });
    document.querySelectorAll('[data-entry-total]').forEach((el) => {
      el.textContent = String(total);
    });

    const active = activeList();
    const q = searchInput ? searchInput.value.trim() : '';
    const filtered = active.length > 0 || q !== '';
    document.querySelectorAll('[data-total-wrap]').forEach((el) => {
      el.hidden = !filtered;
    });
    clearButtons.forEach((b) => b.classList.toggle('hidden', !filtered));
    renderActivePills(active);

    document.querySelectorAll('[data-filter-count-badge]').forEach((el) => {
      el.textContent = active.length ? ' (' + active.length + ')' : '';
    });

    if (emptyState) emptyState.classList.toggle('hidden', shown !== 0 || total === 0);
    grid.classList.toggle('hidden', shown === 0 && total > 0);
    if (emptyCause) {
      const names = active.map((a) => a.label);
      if (q) names.push('“' + q + '”');
      emptyCause.textContent = names.length
        ? 'No ' + plural + ' match ' + names.join(' + ') + '.'
        : 'No ' + plural + ' match the current filters.';
    }

    applyOrder();
    announce(shown, total);
    if (sortSelect) {
      sortSelect.value = sort;
      // A sort with no matching <option> renders as a blank select; fall back.
      if (sortSelect.value !== sort) {
        sort = 'newest';
        sortSelect.value = sort;
      }
    }
    grid.dataset.view = view;
    viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewToggle === view)));
  }

  function fade() {
    grid.classList.add('is-fading');
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => grid.classList.remove('is-fading'))
    );
  }

  function update(push) {
    writeUrl(push !== false);
    fade();
    render();
  }

  /**
   * Toggle one facet value on/off in `state` and re-render.
   * @param {string} key facet key.
   * @param {string} value facet value (slug).
   * @param {boolean} [forceOff] true to always turn it off (used by the "remove" pills).
   */
  function toggleValue(key, value, forceOff) {
    const set = state.get(key) || new Set();
    if (set.has(value) || forceOff) set.delete(value);
    else {
      if (modes.get(key) === 'single') set.clear();
      set.add(value);
    }
    if (set.size) state.set(key, set);
    else state.delete(key);
    update(true);
  }

  /* --------------------------------------------------------------- events */

  // aria-disabled pills stay focusable (so a screen reader still reads the "0")
  // but must not toggle anything.
  pills.forEach((p) =>
    p.addEventListener('click', () => {
      if (p.getAttribute('aria-disabled') === 'true') return;
      toggleValue(p.dataset.filterKey, p.dataset.filterValue);
    })
  );

  clearButtons.forEach((b) =>
    b.addEventListener('click', () => {
      state.clear();
      if (searchInput && searchInput.value) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (sort === 'relevance') sort = 'newest';
      update(true);
      closeSheet();
      if (heading) heading.focus();
    })
  );

  document.querySelectorAll('[data-group-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));
      if (panel) panel.hidden = open;
    });
  });

  document.querySelectorAll('[data-show-all]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fieldset = btn.closest('fieldset');
      if (fieldset) fieldset.querySelectorAll('[data-overflow]').forEach((p) => p.classList.remove('hidden'));
      btn.classList.add('hidden');
    });
  });

  if (sortSelect)
    sortSelect.addEventListener('change', () => {
      sort = sortSelect.value;
      sortExplicit = true;
      update(true);
    });
  viewButtons.forEach((b) =>
    b.addEventListener('click', () => {
      view = b.dataset.viewToggle === 'list' ? 'list' : 'grid';
      update(true);
    })
  );

  let typeTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(typeTimer);
      typeTimer = setTimeout(() => {
        writeUrl(false);
        syncRelevanceOption();
        render();
      }, 300);
    });
  }

  /**
   * "Relevance" only exists while there is a query; it is selected on arrival.
   * Adds/removes the `<option>` and switches `sort` to/from it as the search
   * box goes from empty to non-empty, unless the visitor already picked a sort.
   */
  function syncRelevanceOption() {
    if (!sortSelect) return;
    const q = searchInput ? searchInput.value.trim() : '';
    let opt = sortSelect.querySelector('option[value="relevance"]');
    if (q && !opt) {
      opt = document.createElement('option');
      opt.value = 'relevance';
      opt.textContent = relevanceLabel;
      sortSelect.insertBefore(opt, sortSelect.firstChild);
      if (!sortExplicit && sort === 'newest') sort = 'relevance';
    } else if (!q && opt) {
      opt.remove();
      if (sort === 'relevance') sort = 'newest';
    }
  }

  document.addEventListener('catalog:search', () => {
    syncRelevanceOption();
    render();
  });

  window.addEventListener('popstate', () => {
    readUrl();
    syncRelevanceOption();
    if (searchInput) searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    render();
  });

  /* ---------------------------------------------------------- mobile sheet */

  let sheetTrigger = null;
  let inerted = [];
  const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

  // aria-modal alone does not stop a screen reader reaching the rest of the page,
  // and the sheet is not a <body> child (it renders inside <main> next to its own
  // trigger). Walk from the sheet up to <body> marking every sibling on the way
  // `inert`, so the header, the results, the footer and the trigger itself all
  // drop out of the a11y tree and the tab ring while the dialog is open.
  function inertOutside() {
    releaseInert();
    let node = sheet;
    while (node && node !== document.body && node.parentElement) {
      Array.from(node.parentElement.children).forEach((sib) => {
        if (sib === node || sib.hasAttribute('inert')) return;
        sib.setAttribute('inert', '');
        inerted.push(sib);
      });
      node = node.parentElement;
    }
  }

  function releaseInert() {
    inerted.forEach((el) => el.removeAttribute('inert'));
    inerted = [];
  }

  /**
   * Open the mobile filter sheet, inert the rest of the page, and move focus in.
   * @param {HTMLElement} [trigger] the button that opened it, refocused on close.
   */
  function openSheet(trigger) {
    if (!sheet) return;
    sheetTrigger = trigger || null;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    sheetOpeners.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    inertOutside();
    const first = Array.from(sheet.querySelectorAll(FOCUSABLE)).find(
      (el) => !el.classList.contains('hidden') && !el.closest('[hidden]')
    );
    if (first) first.focus();
  }

  /** Close the mobile filter sheet, release `inert`, and restore focus to its opener. */
  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.body.style.overflow = '';
    sheetOpeners.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    // Release before focusing: the trigger is one of the elements we made inert.
    releaseInert();
    if (sheetTrigger) sheetTrigger.focus();
    sheetTrigger = null;
  }

  sheetOpeners.forEach((b) => b.addEventListener('click', () => openSheet(b)));
  document
    .querySelectorAll('[data-sheet-close],[data-sheet-apply]')
    .forEach((b) => b.addEventListener('click', closeSheet));

  if (sheet) {
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSheet();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(sheet.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.classList.contains('hidden') && !el.closest('[hidden]')
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ----------------------------------------------------------------- boot */

  readUrl();
  syncRelevanceOption();
  render();
  // search.js replays a URL query itself on boot (it loads after this file);
  // this nudge only matters if the script order ever changes.
  if (searchInput && searchInput.value) searchInput.dispatchEvent(new Event('input', { bubbles: true }));
})();
