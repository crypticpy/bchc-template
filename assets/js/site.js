// Small global behaviours: mobile navigation toggle.
(function () {
  const toggle = document.querySelector('[data-nav-toggle]');
  const panel = document.querySelector('[data-nav-panel]');
  if (!toggle || !panel) return;
  const icons = toggle.querySelectorAll('[data-nav-icon]');
  function setOpen(open) {
    panel.hidden = !open;
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', String(open));
    icons.forEach((i) => { i.classList.toggle('hidden', (i.dataset.navIcon === 'open') === open); });
  }
  setOpen(false);
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); } });
})();
