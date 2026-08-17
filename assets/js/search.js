// Lunr search over /search.json. Entry hits narrow the card grid (via
// window.__searchMatches + a "catalog:search" event consumed by filters.js);
// hits of other kinds (events, cohorts) show in a dropdown under the box.
(function () {
  const input = document.querySelector('[data-filter="search"]');
  if (!input || typeof lunr === 'undefined') return;
  const indexUrl = input.dataset.searchIndex || '/search.json';
  const dropdown = document.querySelector('[data-search-results]');
  const otherList = document.querySelector('[data-search-other]');
  let idx = null, docs = [], byRef = new Map(), loading = null;

  function load() {
    if (loading) return loading;
    loading = fetch(indexUrl).then((r) => r.json()).then((data) => {
      docs = data.docs || [];
      docs.forEach((d, i) => byRef.set(String(i), d));
      idx = lunr(function () {
        this.ref('i');
        this.field('title', { boost: 10 });
        this.field('summary', { boost: 4 });
        this.field('text');
        this.metadataWhitelist = [];
        docs.forEach((d, i) => this.add({ i: String(i), title: d.title, summary: d.summary, text: d.text }));
      });
    }).catch(() => { idx = null; });
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
    } catch (e) { hits = []; }
    return hits.map((h) => byRef.get(h.ref)).filter(Boolean);
  }

  function announce(set) {
    window.__searchMatches = set;
    document.dispatchEvent(new CustomEvent('catalog:search'));
  }

  function renderOthers(list) {
    if (!dropdown || !otherList) return;
    otherList.innerHTML = '';
    if (!list.length) { dropdown.classList.add('hidden'); return; }
    list.slice(0, 8).forEach((d) => {
      const li = document.createElement('li');
      li.innerHTML = '<a class="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-brand-primary/5" href="' + d.url + '"><span class="min-w-0"><span class="block truncate font-semibold text-brand-primary-dark">' + escapeHtml(d.title) + '</span><span class="block truncate text-xs text-brand-muted">' + escapeHtml(d.summary || '') + '</span></span><span class="chip-neutral shrink-0">' + escapeHtml(d.kind) + '</span></a>';
      otherList.appendChild(li);
    });
    dropdown.classList.remove('hidden');
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  let timer = null;
  function run() {
    const q = input.value.trim();
    if (!q) { announce(null); renderOthers([]); return; }
    load().then(() => {
      const results = query(q);
      const entryIds = new Set(results.filter((d) => d.kind === 'entry').map((d) => d.id));
      announce(entryIds);
      renderOthers(results.filter((d) => d.kind !== 'entry'));
    });
  }
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
  input.addEventListener('focus', () => load());
  document.addEventListener('click', (e) => { if (dropdown && !dropdown.contains(e.target) && e.target !== input) dropdown.classList.add('hidden'); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; run(); } });
})();
