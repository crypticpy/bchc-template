// Scroll-snap carousel with prev/next buttons. No autoplay.
(function () {
  // Checked per scroll so a mid-session change of the OS setting is honoured.
  const behavior = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('[data-carousel-track]');
    const prev = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    if (!track) return;
    function step() {
      const first = track.firstElementChild;
      return first ? first.getBoundingClientRect().width + 24 : track.clientWidth * 0.8;
    }
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
