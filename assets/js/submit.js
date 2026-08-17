// Turns the schema-rendered form into a pre-filled GitHub issue URL
// (https://github.com/<repo>/issues/new?template=new-entry.yml&<field_id>=<value>)
// with a mailto: fallback. Field ids in the issue template equal schema keys
// (see scripts/generate.mjs), so the query parameters map 1:1.
(function () {
  const form = document.querySelector('[data-submit-form]');
  if (!form) return;

  const repo = form.dataset.repo;
  const template = form.dataset.template || 'new-entry.yml';
  const fallbackEmail = form.dataset.fallbackEmail || '';
  const singular = form.dataset.singular || 'Entry';
  const status = form.querySelector('[data-submit-status]');
  const MAX_URL = 7000; // browsers/GitHub start truncating well below 8k

  function say(msg, tone) {
    if (!status) return;
    status.hidden = false;
    status.textContent = msg;
    status.className = 'rounded-lg border p-4 text-sm ' + (tone === 'error'
      ? 'border-brand-accent/40 bg-brand-accent/10 text-brand-ink'
      : 'border-brand-line bg-surface-base text-brand-muted');
  }

  function collect() {
    const values = {};
    form.querySelectorAll('[data-field]').forEach((wrap) => {
      const key = wrap.dataset.field;
      const type = wrap.dataset.type;
      if (type === 'multiselect') {
        const picked = Array.from(wrap.querySelectorAll('input[type=checkbox]:checked')).map((i) => i.value);
        if (picked.length) values[key] = picked.join(', ');
        return;
      }
      if (type === 'boolean') {
        const box = wrap.querySelector('input[type=checkbox]');
        if (box && box.checked) values[key] = 'true';
        return;
      }
      const el = wrap.querySelector('input, textarea, select');
      if (!el) return;
      const v = (el.value || '').trim();
      if (v) values[key] = v;
    });
    return values;
  }

  function firstInvalid() {
    const el = form.querySelector(':invalid');
    if (el) {
      el.focus();
      const label = form.querySelector('label[for="' + el.id + '"]');
      return label ? label.textContent.replace('*', '').trim() : el.name;
    }
    return null;
  }

  function issueUrl(values) {
    const params = new URLSearchParams();
    params.set('template', template);
    if (values.title) params.set('title', values.title);
    Object.entries(values).forEach(([k, v]) => { if (k !== 'title') params.set(k, v); });
    return 'https://github.com/' + repo + '/issues/new?' + params.toString();
  }

  function mailtoUrl(values) {
    const lines = Object.entries(values).map(([k, v]) => '### ' + k + '\n' + v);
    const params = new URLSearchParams();
    params.set('subject', 'New ' + singular.toLowerCase() + ': ' + (values.title || ''));
    params.set('body', lines.join('\n\n'));
    return 'mailto:' + fallbackEmail + '?' + params.toString().replace(/\+/g, '%20');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const missing = firstInvalid();
    if (missing) { say('Please complete the required field: ' + missing + '.', 'error'); return; }
    if (!repo) { say('This site has no GitHub repository configured (site.yml → github.repository).', 'error'); return; }
    const values = collect();
    const url = issueUrl(values);
    if (url.length > MAX_URL) {
      say('Your write-up is too long to hand off in a link (' + url.length + ' characters). Shorten it, or open the issue and paste the write-up there. Opening GitHub with everything except the write-up…', 'error');
      const trimmed = Object.assign({}, values); delete trimmed.body;
      window.open(issueUrl(trimmed), '_blank', 'noopener');
      return;
    }
    say('Opening GitHub in a new tab. Review the pre-filled issue and press "Submit new issue".');
    window.open(url, '_blank', 'noopener');
  });

  const emailBtn = form.querySelector('[data-submit-email]');
  if (emailBtn) {
    if (!fallbackEmail) emailBtn.hidden = true;
    emailBtn.addEventListener('click', () => {
      const values = collect();
      if (!values.title) { say('Add at least a title before emailing.', 'error'); return; }
      window.location.href = mailtoUrl(values);
    });
  }
})();
