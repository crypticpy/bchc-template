// Lunr search over /search.json, wired as an ARIA combobox.
//
// DATA-ATTRIBUTE CONTRACT (_includes/results-header.html)
//   [data-filter="search"]     role="combobox" input; data-search-index="/search.json"
//                              aria-expanded / aria-controls / aria-activedescendant
//   [data-search-results]      role="listbox" <ul>, `hidden` when closed
//   [data-search-status]       visible status line for a failed index load
//
// PUBLIC CONTRACT consumed by assets/js/filters.js:
//   window.__searchMatches  Set of entry ids that match, or null for "no query"
//   window.__searchOrder    entry ids in relevance order (drives the Relevance sort)
//   "catalog:search"        document event, fired whenever either changes
//
// Entry hits narrow the card grid; hits of other kinds (events, cohorts) and the
// top entry hits are offered in the listbox. A failed index load shows a visible
// message and retries once — the rejected promise is never memoized.
(function () {
  const input = document.querySelector('[data-filter="search"]');
  if (!input) return;
  const listbox = document.querySelector('[data-search-results]');
  const statusEl = document.querySelector('[data-search-status]');
  const indexUrl = input.dataset.searchIndex || '/search.json';

  if (typeof lunr === 'undefined') {
    if (statusEl) {
      statusEl.textContent = 'Search is unavailable — try again.';
      statusEl.classList.remove('hidden');
    }
    return;
  }

  let idx = null;
  let docs = [];
  let loading = null;
  let attempts = 0;
  let options = [];
  let activeIndex = -1;

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('hidden', !message);
  }

  function load() {
    if (idx) return Promise.resolve(true);
    if (loading) return loading;
    attempts += 1;
    loading = fetch(indexUrl)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        docs = (data && data.docs) || [];
        idx = lunr(function () {
          this.ref('i');
          this.field('title', { boost: 10 });
          this.field('summary', { boost: 4 });
          this.field('text');
          this.metadataWhitelist = [];
          docs.forEach((d, i) =>
            this.add({ i: String(i), title: d.title, summary: d.summary, text: d.text })
          );
        });
        setStatus('');
        return true;
      })
      .catch(() => {
        // Never memoize a rejection: drop the promise so the next keystroke retries.
        loading = null;
        idx = null;
        setStatus(attempts < 2 ? 'Search is unavailable — retrying…' : 'Search is unavailable — try again.');
        if (attempts < 2) return load();
        return false;
      });
    return loading;
  }

  function query(q) {
    if (!idx) return [];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    let hits = [];
    try {
      hits = idx.query((qb) => {
        terms.forEach((t) => {
          qb.term(t, { boost: 10 });
          qb.term(t, { wildcard: lunr.Query.wildcard.TRAILING, boost: 3 });
          if (t.length > 3) qb.term(t, { editDistance: 1 });
        });
      });
    } catch (e) {
      hits = [];
    }
    return hits.map((h) => docs[Number(h.ref)]).filter(Boolean);
  }

  function announce(matches, order) {
    window.__searchMatches = matches;
    window.__searchOrder = order;
    document.dispatchEvent(new CustomEvent('catalog:search'));
  }

  /* ------------------------------------------------------------- listbox */

  function close() {
    if (!listbox) return;
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }

  function highlight(i) {
    activeIndex = i;
    options.forEach((el, n) => {
      const on = n === i;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
    });
    if (i >= 0 && options[i]) {
      input.setAttribute('aria-activedescendant', options[i].id);
      options[i].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function optionRow(doc, i) {
    const li = document.createElement('li');
    li.className = 'search-option';
    li.id = 'search-option-' + i;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.url = doc.url;

    const text = document.createElement('span');
    text.className = 'min-w-0';
    const title = document.createElement('span');
    title.className = 'block truncate font-semibold text-brand-primary-dark';
    title.textContent = doc.title || '';
    const summary = document.createElement('span');
    summary.className = 'block truncate text-xs text-brand-muted';
    summary.textContent = doc.summary || '';
    text.appendChild(title);
    text.appendChild(summary);

    const kind = document.createElement('span');
    kind.className = 'chip-neutral shrink-0';
    kind.textContent = doc.kind || '';

    li.appendChild(text);
    li.appendChild(kind);
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      go(li);
    });
    li.addEventListener('mouseenter', () => highlight(i));
    return li;
  }

  function go(li) {
    if (li && li.dataset.url) window.location.href = li.dataset.url;
  }

  function renderList(results) {
    if (!listbox) return;
    listbox.textContent = '';
    options = [];
    const others = results.filter((d) => d.kind !== 'entry').slice(0, 5);
    const entries = results.filter((d) => d.kind === 'entry').slice(0, 5);
    const shown = others.concat(entries);
    if (!shown.length) {
      close();
      return;
    }
    shown.forEach((doc, i) => {
      const li = optionRow(doc, i);
      options.push(li);
      listbox.appendChild(li);
    });
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    highlight(-1);
  }

  /* -------------------------------------------------------------- events */

  let timer = null;
  function run() {
    const q = input.value.trim();
    if (!q) {
      announce(null, []);
      close();
      return;
    }
    load().then((ok) => {
      if (!ok) {
        announce(null, []);
        close();
        return;
      }
      const results = query(q);
      const entryIds = results.filter((d) => d.kind === 'entry').map((d) => d.id);
      announce(new Set(entryIds), entryIds);
      renderList(results);
    });
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });
  input.addEventListener('focus', () => load());

  input.addEventListener('keydown', (e) => {
    const open = listbox && !listbox.hidden;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        run();
        return;
      }
      highlight(activeIndex + 1 >= options.length ? 0 : activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return;
      highlight(activeIndex - 1 < 0 ? options.length - 1 : activeIndex - 1);
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0) {
        e.preventDefault();
        go(options[activeIndex]);
      } else close();
    } else if (e.key === 'Escape') {
      // First Esc closes the listbox, a second one clears the query.
      if (open) {
        e.preventDefault();
        close();
      }
      // Clearing has to go through the same path a keystroke takes, otherwise
      // filters.js never hears about it and ?q= survives in the URL (and a
      // relevance sort is left selected with no query to rank against).
      else if (input.value) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target === input) return;
    if (listbox && listbox.contains(e.target)) return;
    close();
  });
})();
