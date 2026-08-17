// Entry page enhancements: copy-link button and table-of-contents scroll-spy.
// Both are optional — the page is complete and navigable without them.
(function () {
  setupCopyLink();
  setupScrollSpy();

  /**
   * Wire the "Copy link" button. The button is hidden when the browser has no
   * clipboard API (or the page is not in a secure context), so it never offers
   * an action it cannot perform.
   */
  function setupCopyLink() {
    const button = document.querySelector('[data-copy-link]');
    if (!button) return;
    const status = document.querySelector('[data-copy-status]');
    const canCopy = Boolean(navigator.clipboard && navigator.clipboard.writeText);
    if (!canCopy) {
      button.hidden = true;
      return;
    }
    button.hidden = false;
    let timer = null;
    button.addEventListener('click', () => {
      const url = button.dataset.copyLink || window.location.href;
      navigator.clipboard.writeText(url).then(
        () => announce('Link copied to your clipboard.'),
        () => announce('Copying failed — press Ctrl or Cmd + C to copy the address bar.')
      );
    });

    /**
     * Put a message in the button's status region and clear it after a while.
     * @param {string} message
     */
    function announce(message) {
      if (!status) return;
      status.textContent = message;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        status.textContent = '';
      }, 4000);
    }
  }

  /**
   * Mark the table-of-contents link whose section is currently on screen with
   * `aria-current="true"`. Uses IntersectionObserver where available.
   */
  function setupScrollSpy() {
    const toc = document.querySelector('[data-toc]');
    if (!toc || typeof IntersectionObserver !== 'function') return;
    const links = Array.from(toc.querySelectorAll('[data-toc-link]'));
    const targets = links
      .map((link) => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
      .filter((pair) => pair.target);
    if (targets.length === 0) return;

    let current = null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const pair = targets.find((p) => p.target === entry.target);
          if (!pair || pair === current) return;
          if (current) current.link.removeAttribute('aria-current');
          pair.link.setAttribute('aria-current', 'true');
          current = pair;
        });
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );
    targets.forEach((pair) => observer.observe(pair.target));
  }
})();
