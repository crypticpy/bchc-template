// Scroll-snap carousel with prev/next buttons. No autoplay.
//
// Data-attribute contract:
//   [data-carousel]        root; one instance is wired per match
//   [data-carousel-track]  the scrollable strip (CSS scroll-snap does the rest)
//   [data-carousel-prev]   optional "previous" button, disabled at the start
//   [data-carousel-next]   optional "next" button, disabled at the end
// Nothing is exported; this only attaches DOM event listeners.
(function () {
  // Checked per scroll so a mid-session change of the OS setting is honoured.
  const behavior = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('[data-carousel-track]');
    const prev = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    if (!track) return;
    /** @returns {number} px to scroll per step: one card's width (+ gap), or 80% of the track as a fallback. */
    function step() {
      const first = track.firstElementChild;
      return first ? first.getBoundingClientRect().width + 24 : track.clientWidth * 0.8;
    }
    /** Sync the prev/next buttons' disabled state with the current scroll position. */
    function update() {
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      [prev, next].forEach((b) => b && b.classList.toggle('opacity-40', b.disabled));
    }
    prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: behavior() }));
    next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: behavior() }));
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        track.scrollBy({ left: step(), behavior: behavior() });
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        track.scrollBy({ left: -step(), behavior: behavior() });
      }
    });
    window.addEventListener('resize', update);
    update();
  });
})();
