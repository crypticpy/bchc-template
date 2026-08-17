---
layout: default
title: "Submit"
summary: "Propose a new entry for the catalog."
permalink: /submit/
---
{%- assign cfg = site.data.site -%}
{%- assign schema = site.data.schema -%}
{%- assign singular = schema.entry.singular | default: 'Entry' -%}
{%- assign form_fields = schema.fields | where_exp: 'f', 'f.form != false' -%}
<section class="mb-10 max-w-3xl">
  <span class="eyebrow">Contribute</span>
  <h1 class="mt-2 font-heading text-4xl font-semibold text-brand-primary-dark sm:text-5xl">Submit a {{ singular | downcase }}</h1>
  <p class="mt-4 text-lg text-brand-muted">{{ cfg.submit.intro | default: 'Tell us about your work. Maintainers review every submission before it is published.' }}</p>
</section>

<div class="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <form class="card min-w-0 space-y-8 p-6 sm:p-8" data-submit-form
        data-repo="{{ cfg.github.repository }}"
        data-template="new-entry.yml"
        data-fallback-email="{{ cfg.submit.fallback_email | default: cfg.organization.contact_email }}"
        data-singular="{{ singular }}"
        novalidate>
    {% for f in form_fields %}
      {% assign fid = 'f-' | append: f.key %}
      <div class="space-y-2" data-field="{{ f.key }}" data-type="{{ f.type }}">
        <label class="field-label" for="{{ fid }}">{{ f.label }}{% if f.required %} <span class="text-brand-accent" aria-hidden="true">*</span>{% endif %}</label>
        {% if f.description %}<p class="field-help" id="{{ fid }}-help">{{ f.description }}</p>{% endif %}
        {% case f.type %}
        {% when 'textarea' or 'markdown' or 'list' %}
          <textarea class="field-input min-h-[7rem]" id="{{ fid }}" name="{{ f.key }}" rows="{% if f.type == 'markdown' %}10{% else %}4{% endif %}" {% if f.required %}required{% endif %} placeholder="{{ f.placeholder | escape }}" {% if f.description %}aria-describedby="{{ fid }}-help"{% endif %}></textarea>
          {% if f.type == 'list' %}<p class="field-help">One per line, or separate with commas.</p>{% endif %}
        {% when 'select' %}
          <select class="field-input" id="{{ fid }}" name="{{ f.key }}" {% if f.required %}required{% endif %}>
            <option value="">Select one…</option>
            {% for o in f.options %}<option value="{{ o }}">{{ o }}</option>{% endfor %}
          </select>
        {% when 'multiselect' %}
          <fieldset class="grid gap-2 sm:grid-cols-2" id="{{ fid }}"><legend class="sr-only">{{ f.label }}</legend>
            {% for o in f.options %}<label class="flex items-start gap-2 rounded-md border border-brand-line bg-surface-base px-3 py-2 text-sm text-brand-ink hover:border-brand-primary/50"><input class="mt-0.5 rounded border-brand-line text-brand-primary focus:ring-brand-primary" type="checkbox" name="{{ f.key }}" value="{{ o }}"><span>{{ o }}</span></label>{% endfor %}
          </fieldset>
        {% when 'boolean' %}
          <label class="flex items-center gap-2 text-sm"><input class="rounded border-brand-line text-brand-primary" type="checkbox" id="{{ fid }}" name="{{ f.key }}" value="true"><span>Yes</span></label>
        {% when 'file' or 'image' %}
          <p class="rounded-md border border-dashed border-brand-line bg-surface-base px-4 py-3 text-sm text-brand-muted">Files can't be attached here. After you open the GitHub issue, drag the file into the issue description (or a comment) and a maintainer will add it to your entry.</p>
        {% when 'date' %}
          <input class="field-input" type="date" id="{{ fid }}" name="{{ f.key }}" {% if f.required %}required{% endif %}>
        {% when 'number' %}
          <input class="field-input" type="number" id="{{ fid }}" name="{{ f.key }}" {% if f.required %}required{% endif %} placeholder="{{ f.placeholder | escape }}">
        {% when 'url' or 'email' %}
          <input class="field-input" type="{{ f.type }}" id="{{ fid }}" name="{{ f.key }}" {% if f.required %}required{% endif %} placeholder="{{ f.placeholder | escape }}" {% if f.description %}aria-describedby="{{ fid }}-help"{% endif %}>
        {% else %}
          <input class="field-input" type="text" id="{{ fid }}" name="{{ f.key }}" {% if f.required %}required{% endif %} placeholder="{{ f.placeholder | escape }}" {% if f.description %}aria-describedby="{{ fid }}-help"{% endif %}>
        {% endcase %}
      </div>
    {% endfor %}

    <div class="rounded-lg border border-brand-line bg-surface-base p-4 text-sm text-brand-muted" data-submit-status hidden></div>

    <div class="flex flex-col gap-3 border-t border-brand-line pt-6 sm:flex-row sm:items-center">
      <button type="submit" class="btn-primary">Continue on GitHub {% include icon.html name='arrow-right' size='sm' %}</button>
      <button type="button" class="btn-secondary" data-submit-email>Email it instead</button>
      <span class="text-xs text-brand-muted">You'll need a free GitHub account to open the issue.</span>
    </div>
  </form>

  <aside class="space-y-6">
    <section class="card p-6">
      <h2 class="font-heading text-lg font-semibold text-brand-primary-dark">What happens next</h2>
      <ol class="mt-4 space-y-3 text-sm text-brand-muted">
        <li class="flex gap-3"><span class="chip shrink-0">1</span><span>Clicking <strong>Continue on GitHub</strong> opens a pre-filled GitHub issue with your answers. Review, then press <em>Submit new issue</em>.</span></li>
        <li class="flex gap-3"><span class="chip shrink-0">2</span><span>Automation drafts a page and opens a pull request for maintainers.</span></li>
        <li class="flex gap-3"><span class="chip shrink-0">3</span><span>{{ cfg.submit.review_note | default: 'A maintainer reviews the draft, may ask follow-up questions on the issue, and merges it. Your entry goes live within minutes.' }}</span></li>
      </ol>
    </section>
    <section class="card p-6">
      <h2 class="font-heading text-lg font-semibold text-brand-primary-dark">Tips</h2>
      <ul class="mt-4 list-disc space-y-2 pl-5 text-sm text-brand-muted">
        <li>Write the summary for someone outside your team — one or two plain sentences.</li>
        <li>Link the source repo or deployment if it's shareable; otherwise describe the setup in the write-up.</li>
        <li>Anything you leave blank can be added later by editing the page on GitHub.</li>
      </ul>
    </section>
    <section class="card p-6">
      <h2 class="font-heading text-lg font-semibold text-brand-primary-dark">No GitHub account?</h2>
      <p class="mt-2 text-sm text-brand-muted">Use <strong>Email it instead</strong> — it opens your mail client with the same details addressed to the maintainers.</p>
    </section>
  </aside>
</div>
<script src="{{ '/assets/js/submit.js' | relative_url }}" defer></script>
