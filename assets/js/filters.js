// Generic client-side faceted filtering.
//
// Cards:   <article data-entry data-facet-<key>="slug,slug" data-entry-title="…">
// Buttons: <button data-filter-option="<key>" data-filter-mode="single|multi" data-filter-value="slug" data-filter-label="Label">
// Search:  window.__searchMatches (Set of entry ids, or null) is maintained by search.js;
//          it dispatches a "catalog:search" event whenever it changes.
// URL:     ?<key>=slug,slug&q=term is kept in sync so filtered views are shareable.
(function () {
  const root = document.querySelector('[data-component="filters"]');
  const grid = document.querySelector('[data-entry-grid]');
  if (!root || !grid) return;

  const cards = Array.from(grid.querySelectorAll('[data-entry]'));
  const buttons = Array.from(root.querySelectorAll('[data-filter-option]'));
  const summary = root.querySelector('[data-filter-summary]');
  const activePills = root.querySelector('[data-filter-active-pills]');
  const clearBtn = root.querySelector('[data-filter-clear]');
  const searchInput = root.querySelector('[data-filter="search"]');
  const countEl = document.querySelector('[data-entry-count]');
  const countLabel = document.querySelector('[data-entry-count-label]');
  const emptyState = document.querySelector('[data-empty-state]');
  const plural = root.dataset.entryPlural || 'entries';
  const singular = plural.endsWith('s') ? plural.slice(0, -1) : plural;

  // key -> Set of selected slugs
  const state = new Map();
  const modes = new Map();
  buttons.forEach((b) => modes.set(b.dataset.filterOption, b.dataset.filterMode || 'multi'));

  function readUrl() {
    const params = new URLSearchParams(window.location.search);
    modes.forEach((_, key) => {
      const raw = params.get(key) || params.get(key.replace(/-/g, '_'));
      if (raw) state.set(key, new Set(raw.split(',').map((s) => s.trim()).filter(Boolean)));
    });
    const q = params.get('q');
    if (q && searchInput) { searchInput.value = q; }
  }

  function writeUrl() {
    const params = new URLSearchParams();
    state.forEach((set, key) => { if (set.size) params.set(key, Array.from(set).join(',')); });
    if (searchInput && searchInput.value.trim()) params.set('q', searchInput.value.trim());
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    window.history.replaceState(null, '', url);
  }

  function cardMatches(card) {
    for (const [key, set] of state) {
      if (!set.size) continue;
      const raw = card.getAttribute('data-facet-' + key) || '';
      const have = raw.split(',').map((s) => s.trim()).filter(Boolean);
      // OR within a facet, AND across facets
      if (!have.some((v) => set.has(v))) return false;
    }
    const matches = window.__searchMatches;
    if (matches instanceof Set) {
      return matches.has(card.dataset.entryId);
    }
    return true;
  }

  function labelFor(key, value) {
    const b = buttons.find((x) => x.dataset.filterOption === key && x.dataset.filterValue === value);
    return b ? b.dataset.filterLabel : value;
  }

  function render() {
    let shown = 0;
    cards.forEach((card) => {
      const ok = cardMatches(card);
      card.classList.toggle('hidden', !ok);
      card.toggleAttribute('data-hidden', !ok);
      if (ok) shown++;
    });
    buttons.forEach((b) => {
      const on = state.get(b.dataset.filterOption)?.has(b.dataset.filterValue) || false;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (countEl) countEl.textContent = String(shown);
    if (countLabel) countLabel.textContent = shown === 1 ? singular : plural;
    if (emptyState) emptyState.classList.toggle('hidden', shown !== 0 || cards.length === 0);
    grid.classList.toggle('hidden', shown === 0 && cards.length > 0);

    const activeCount = Array.from(state.values()).reduce((n, s) => n + s.size, 0);
    const q = searchInput ? searchInput.value.trim() : '';
    if (summary) {
      if (!activeCount && !q) summary.textContent = 'Showing all ' + cards.length + ' ' + plural;
      else summary.textContent = 'Showing ' + shown + ' of ' + cards.length + ' ' + plural + (q ? ' matching “' + q + '”' : '');
    }
    if (activePills) {
      activePills.innerHTML = '';
      state.forEach((set, key) => set.forEach((value) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'chip hover:bg-brand-primary/20';
        pill.innerHTML = labelFor(key, value) + ' <span aria-hidden="true">×</span><span class="sr-only">Remove filter</span>';
        pill.addEventListener('click', () => { set.delete(value); update(); });
        activePills.appendChild(pill);
      }));
    }
    if (clearBtn) clearBtn.disabled = !activeCount && !q;
  }

  function update() { writeUrl(); render(); }

  buttons.forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.filterOption, value = b.dataset.filterValue;
    const set = state.get(key) || new Set();
    if (set.has(value)) set.delete(value);
    else { if (modes.get(key) === 'single') set.clear(); set.add(value); }
    state.set(key, set);
    update();
  }));

  if (clearBtn) clearBtn.addEventListener('click', () => {
    state.clear();
    if (searchInput) { searchInput.value = ''; searchInput.dispatchEvent(new Event('input', { bubbles: true })); }
    update();
  });

  document.addEventListener('catalog:search', () => update());

  readUrl();
  render();
  // Let search.js know about a pre-filled query from the URL.
  if (searchInput && searchInput.value) searchInput.dispatchEvent(new Event('input', { bubbles: true }));
})();
