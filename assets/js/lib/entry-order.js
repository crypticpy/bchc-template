/**
 * Grid ordering for the catalog. Split out of assets/js/filters.js: the sort
 * menu's five modes are a self-contained rule set over the cards' data
 * attributes (see _includes/entry-card.html for what each one carries).
 */

/**
 * Build a comparator over indices into `cards` for the chosen sort.
 * Unknown values (including the default "newest") fall back to newest-first.
 * @param {string} sort 'newest' | 'updated' | 'az' | 'relevance' | 'field:<key>'.
 * @param {HTMLElement[]} cards the card elements, in document order.
 * @param {string[]} [relevanceOrder] entry ids ranked by search relevance.
 * @returns {(a: number, b: number) => number}
 */
export function comparatorFor(sort, cards, relevanceOrder = []) {
  if (sort === 'az')
    return (a, b) => (cards[a].dataset.entryTitle || '').localeCompare(cards[b].dataset.entryTitle || '');
  if (sort === 'updated')
    return (a, b) =>
      (cards[b].dataset.entryUpdated || cards[b].dataset.entryDate || '').localeCompare(
        cards[a].dataset.entryUpdated || cards[a].dataset.entryDate || ''
      );
  if (sort === 'relevance') {
    const order = Array.isArray(relevanceOrder) ? relevanceOrder : [];
    // Anything the query did not rank sinks below everything it did.
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

/**
 * Re-append every card to the grid in `comparator` order, skipping the DOM
 * write when the order has not changed.
 * @param {HTMLElement} grid the `[data-entry-grid]` list.
 * @param {HTMLElement[]} cards the card elements.
 * @param {(a: number, b: number) => number} comparator from `comparatorFor`.
 * @param {string} previous the signature returned by the last call.
 * @returns {string} the new signature, to pass back next time.
 */
export function applyOrder(grid, cards, comparator, previous) {
  const idx = cards.map((_, i) => i).sort(comparator);
  const signature = idx.join(',');
  if (signature === previous) return signature;
  const frag = document.createDocumentFragment();
  idx.forEach((i) => frag.appendChild(cards[i]));
  grid.appendChild(frag);
  return signature;
}
