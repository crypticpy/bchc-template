// Faceted filtering, sorting, view switching and URL state for the catalog.
//
// ES module (loaded with <script type="module"> by _layouts/default.html, which
// keeps it in document order with the other deferred scripts). The pure rules
// live in ./lib/filter-state.js and the mobile dialog in ./filter-sheet.js.
//
// DATA-ATTRIBUTE CONTRACT
//   Cards   <li data-entry data-entry-id data-entry-title data-entry-date
//               [data-entry-updated] data-facet-<key>="slug,slug"
//               [data-sort-<key>]>            (_includes/entry-card.html)
//   Grid    <ul data-entry-grid data-view="grid|list">
//   Pills   <button data-filter-key="<key>" data-filter-mode="single|multi"
//               data-filter-value="<slug>" data-filter-label="<value>"
//               aria-pressed>  <span data-filter-count aria-hidden>
//               <span data-filter-count-sr>   (rail AND sheet)
//   Groups  [data-filter-group] > [data-group-toggle][aria-expanded] + [data-group-panel]
//           [data-show-all] reveals the pills marked [data-overflow]
//   Header  [data-filters-config] (data-entry-plural/-singular, data-relevance-label),
//           [data-entry-count], [data-entry-count-label], [data-entry-total],
//           [data-total-wrap], [data-filter-active-pills], [data-filter-clear],
//           [data-sort], [data-view-toggle="grid|list"], [data-filter-status]
//   Empty   [data-empty-state] > [data-empty-cause], [data-empty-filters]
//   Sheet   see ./filter-sheet.js
//   Search  [data-filter="search"]; assets/js/search.js owns window.__searchMatches
//           (Set of entry ids or null), window.__searchOrder (ids by relevance) and
//           fires the "catalog:search" event when either changes.
//
// URL: ?<key>=<slug>,<slug>&q=&sort=&view= — pushState on toggles (throttled, so
// a burst of clicks is one history entry), debounced replaceState while typing,
// restored on load, Back undoes.
import { initFilterSheet } from './filter-sheet.js';
import { applyOrder, comparatorFor } from './lib/entry-order.js';
import {
  countLabel,
  countValue,
  facetMatches,
  parseQuery,
  pluralize,
  serializeQuery,
  statusText,
  toggleFacet,
} from './lib/filter-state.js';

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
  const heading = document.getElementById('results-heading');

  const plural = (cfg && cfg.dataset.entryPlural) || 'entries';
  const singular = (cfg && cfg.dataset.entrySingular) || plural.replace(/s$/, '');
  const relevanceLabel = (cfg && cfg.dataset.relevanceLabel) || 'Relevance';

  const keys = Array.from(new Set(pills.map((p) => p.dataset.filterKey)));
  const modes = new Map();
  pills.forEach((p) => modes.set(p.dataset.filterKey, p.dataset.filterMode || 'multi'));

  // key -> Set(slug). Sorting and view are single values.
  let state = new Map();
  let sort = 'newest';
  let sortExplicit = false;
  let view = grid.dataset.view === 'list' ? 'list' : 'grid';
  let appliedOrder = '';
  // No announcement until the visitor has actually changed something: the boot
  // render would otherwise interrupt whatever the screen reader is reading.
  let booted = false;

  const sheet = initFilterSheet();

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
    const parsed = parseQuery(window.location.search, keys);
    state = parsed.state;
    if (searchInput) searchInput.value = parsed.q;
    sort = parsed.sort;
    sortExplicit = parsed.sortExplicit;
    view = parsed.view;
  }

  let lastPush = 0;
  /**
   * Serialize `state`/`sort`/`view` back onto the URL.
   * @param {boolean} push true to push a new history entry (a toggle), false
   *   to replace the current one (debounced typing, so Back doesn't step
   *   through every keystroke). A burst of toggles inside 400 ms collapses
   *   into the first one's entry, so Back is not a click-by-click rewind.
   */
  function writeUrl(push) {
    const qs = serializeQuery({
      state,
      q: searchInput ? searchInput.value : '',
      sort,
      view,
    });
    const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    const now = Date.now();
    if (push && now - lastPush > 400) {
      lastPush = now;
      window.history.pushState(null, '', url);
    } else {
      window.history.replaceState(null, '', url);
    }
  }

  /* -------------------------------------------------------------- matching */

  function searchOk(i) {
    const set = window.__searchMatches;
    return !(set instanceof Set) || set.has(cards[i].dataset.entryId);
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

  /* --------------------------------------------------------------- render */

  let announceTimer = null;
  /**
   * Debounced live-region update for screen readers: result count plus the
   * active filter/search terms. Debounced so rapid pill clicks don't spam
   * announcements, and silent until `booted` so the first paint says nothing.
   * @param {number} shown cards currently visible.
   * @param {number} total cards on the page.
   */
  function announce(shown, total) {
    if (!statusEl || !booted) return;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      const names = activeList().map((a) => a.label);
      const q = searchInput ? searchInput.value.trim() : '';
      if (q) names.push('“' + q + '”');
      statusEl.textContent = statusText(shown, total, singular, plural, names);
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
          setFilter(a.key, a.value, true);
        });
        target.appendChild(btn);
      });
    };
    activeWraps.forEach(build);
    if (emptyFilters) build(emptyFilters);
  }

  /**
   * Recompute every pill's live count, pressed/empty state and screen-reader
   * label. Each facet is counted against everything EXCEPT itself, so a pill
   * never narrows its own group.
   */
  function renderPills() {
    keys.forEach((key) => {
      const base = [];
      cards.forEach((_, i) => {
        if (facetMatches(facets[i], state, key) && searchOk(i)) base.push(i);
      });
      pills
        .filter((p) => p.dataset.filterKey === key)
        .forEach((p) => {
          const value = p.dataset.filterValue;
          const n = countValue(facets, base, key, value);
          const on = (state.get(key) || new Set()).has(value);
          p.setAttribute('aria-pressed', String(on));
          p.classList.toggle('is-active', on);
          p.classList.toggle('is-empty', n === 0 && !on);
          if (n === 0 && !on) p.setAttribute('aria-disabled', 'true');
          else p.removeAttribute('aria-disabled');
          // The visible number is hidden from the a11y tree; without that,
          // "Topic 12" is announced as a single unintelligible token.
          const badge = p.querySelector('[data-filter-count]');
          if (badge) badge.textContent = String(n);
          const badgeSr = p.querySelector('[data-filter-count-sr]');
          if (badgeSr) badgeSr.textContent = countLabel(n);
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
  }

  /**
   * Full re-render: show/hide cards, recompute per-pill live counts, update the
   * count/empty-state text, reorder the grid and sync the sort/view controls.
   * Called after any state change (`update()`) and on `catalog:search`/`popstate`.
   */
  function render() {
    let shown = 0;
    cards.forEach((card, i) => {
      const ok = facetMatches(facets[i], state, null) && searchOk(i);
      card.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });

    renderPills();

    const total = cards.length;
    document.querySelectorAll('[data-entry-count]').forEach((el) => {
      el.textContent = String(shown);
    });
    document.querySelectorAll('[data-entry-count-label]').forEach((el) => {
      el.textContent = pluralize(shown, singular, plural);
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

    appliedOrder = applyOrder(grid, cards, comparatorFor(sort, cards, window.__searchOrder), appliedOrder);
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
   * Toggle one facet value on/off and re-render.
   * @param {string} key facet key.
   * @param {string} value facet value (slug).
   * @param {boolean} [forceOff] true to always turn it off (used by the "remove" pills).
   */
  function setFilter(key, value, forceOff) {
    toggleFacet(state, key, value, modes.get(key), forceOff);
    update(true);
  }

  /* --------------------------------------------------------------- events */

  // aria-disabled pills stay focusable (so a screen reader still reads the "0")
  // but must not toggle anything.
  pills.forEach((p) =>
    p.addEventListener('click', () => {
      if (p.getAttribute('aria-disabled') === 'true') return;
      setFilter(p.dataset.filterKey, p.dataset.filterValue);
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
      sheet.close();
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
      const revealed = fieldset ? Array.from(fieldset.querySelectorAll('[data-overflow]')) : [];
      revealed.forEach((p) => p.classList.remove('hidden'));
      btn.classList.add('hidden');
      // The button just became display:none under the focus; hand focus to the
      // first pill it revealed so it never sits on a hidden element.
      const target = revealed[0] || (fieldset && fieldset.querySelector('.filter-pill'));
      if (target) target.focus();
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

  /* ----------------------------------------------------------------- boot */

  readUrl();
  syncRelevanceOption();
  render();
  booted = true;
  // search.js replays a URL query itself on boot (it loads after this file);
  // this nudge only matters if the script order ever changes.
  if (searchInput && searchInput.value) searchInput.dispatchEvent(new Event('input', { bubbles: true }));
})();
