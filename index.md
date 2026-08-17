---
layout: default
title: "Home"
include_carousel: true
full_width: true
---
{%- assign cfg = site.data.site -%}
{%- assign schema = site.data.schema -%}
{%- assign plural = schema.entry.plural | default: 'Entries' -%}
{%- assign singular = schema.entry.singular | default: 'Entry' -%}
{%- assign epath = schema.entry.path | default: 'catalog' -%}
{%- assign catalog_url = '/' | append: epath | append: '/' -%}
{%- assign entries = site.pages | where: 'layout', 'entry' | sort: 'published', 'first' | reverse -%}
{%- assign total = entries | size -%}
{%- assign featured = entries | where: 'featured', true -%}
{%- assign featured_count = cfg.home.featured_count | default: 6 -%}
{%- if featured.size < featured_count -%}
  {%- assign fill = featured_count | minus: featured.size -%}
  {%- assign others = entries | where_exp: 'e', 'e.featured != true' | slice: 0, fill -%}
  {%- assign featured = featured | concat: others -%}
{%- endif -%}
{%- assign featured = featured | slice: 0, featured_count -%}
{%- assign facet_fields = schema.fields | where: 'facet', true -%}
{%- assign first_facet = facet_fields | first -%}
{%- assign second_facet = facet_fields[1] -%}
{%- assign browse_facet = nil -%}
{%- for f in facet_fields -%}{%- if f.options and browse_facet == nil -%}{%- assign browse_facet = f -%}{%- endif -%}{%- endfor -%}
{%- assign upcoming = site.data.events_all | where: 'past', false -%}

<!-- Hero -->
<section class="relative overflow-hidden bg-brand-primary-dark text-brand-on-dark">
  <div class="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-primary/50 blur-3xl" aria-hidden="true"></div>
  <div class="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-brand-secondary/30 blur-3xl" aria-hidden="true"></div>
  <div class="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.5fr_minmax(0,1fr)] lg:px-8 lg:py-24">
    <div class="space-y-6">
      {% if cfg.hero.eyebrow %}<span class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-brand-on-dark">{{ cfg.hero.eyebrow }}</span>{% endif %}
      <h1 class="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">{{ cfg.hero.title | default: cfg.name }}</h1>
      {% if cfg.hero.lead %}<p class="max-w-2xl text-lg leading-relaxed text-brand-on-dark/90">{{ cfg.hero.lead }}</p>{% endif %}
      <div class="flex flex-col gap-3 sm:flex-row">
        {% if cfg.hero.primary_cta.label %}<a class="btn-primary !bg-white !text-brand-primary-dark hover:!bg-brand-on-dark" href="{{ cfg.hero.primary_cta.url | relative_url }}">{{ cfg.hero.primary_cta.label }} {% include icon.html name='arrow-right' size='sm' %}</a>{% endif %}
        {% if cfg.hero.secondary_cta.label %}{% assign sec_url = cfg.hero.secondary_cta.url %}{% if sec_url != '/submit/' or cfg.modules.submit %}<a class="btn-on-dark" href="{{ sec_url | relative_url }}">{{ cfg.hero.secondary_cta.label }}</a>{% endif %}{% endif %}
      </div>
    </div>
    {% if cfg.modules.stats %}
    <div class="grid gap-4 sm:grid-cols-2">
      {% assign l = plural %}{% include stat-block.html value=total label=l description='published so far' %}
      {% if first_facet %}
        {% assign vals = "" | split: "" %}
        {% for e in entries %}{% assign v = e[first_facet.key] %}{% if v.first %}{% for x in v %}{% assign vals = vals | push: x %}{% endfor %}{% elsif v and v != '' %}{% assign vals = vals | push: v %}{% endif %}{% endfor %}
        {% assign n = vals | uniq | size %}
        {% assign lbl = first_facet.label %}{% assign last = lbl | slice: -1 %}{% if last != 's' %}{% assign lbl = lbl | append: 's' %}{% endif %}{% include stat-block.html value=n label=lbl description='represented' %}
      {% endif %}
      {% if second_facet %}
        {% assign vals = "" | split: "" %}
        {% for e in entries %}{% assign v = e[second_facet.key] %}{% if v.first %}{% for x in v %}{% assign vals = vals | push: x %}{% endfor %}{% elsif v and v != '' %}{% assign vals = vals | push: v %}{% endif %}{% endfor %}
        {% assign n = vals | uniq | size %}
        {% assign lbl = second_facet.label %}{% assign last = lbl | slice: -1 %}{% if last != 's' %}{% assign lbl = lbl | append: 's' %}{% endif %}{% include stat-block.html value=n label=lbl description='covered' %}
      {% endif %}
      {% if cfg.modules.events %}{% assign n = upcoming | size %}{% include stat-block.html value=n label='Upcoming events' description='on the calendar' %}
      {% elsif cfg.modules.cohorts %}{% assign n = site.data.cohorts | size %}{% include stat-block.html value=n label='Cohorts' description='published' %}
      {% else %}{% assign latest = entries | first %}{% if latest %}{% assign d = latest.published | date: '%b %-d' %}{% include stat-block.html value=d label='Latest addition' description=latest.title %}{% endif %}{% endif %}
    </div>
    {% endif %}
  </div>
</section>

<div class="mx-auto w-full max-w-7xl space-y-20 px-4 py-14 sm:px-6 lg:px-8">

  {% if cfg.modules.carousel and featured.size > 0 %}
  <!-- Featured carousel -->
  <section aria-labelledby="featured-heading" data-carousel>
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><span class="eyebrow">Featured</span><h2 id="featured-heading" class="section-title mt-1">Spotlight {{ plural | downcase }}</h2></div>
      <div class="flex items-center gap-2">
        <button type="button" class="btn-secondary !p-2" data-carousel-prev aria-label="Previous">{% include icon.html name='chevron-left' size='sm' %}</button>
        <button type="button" class="btn-secondary !p-2" data-carousel-next aria-label="Next">{% include icon.html name='chevron-right' size='sm' %}</button>
      </div>
    </div>
    <div class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 sm:mx-0 sm:px-0" data-carousel-track tabindex="0" aria-label="Featured {{ plural | downcase }} carousel">
      {% for e in featured %}
        <div class="w-[85%] shrink-0 snap-start sm:w-[48%] xl:w-[32%]">{% include entry-card.html entry=e %}</div>
      {% endfor %}
    </div>
  </section>
  {% endif %}

  {% if cfg.modules.catalog and browse_facet %}
  <!-- Browse by first facet with options -->
  <section aria-labelledby="browse-heading">
    <div class="mb-6"><span class="eyebrow">Browse</span><h2 id="browse-heading" class="section-title mt-1">By {{ browse_facet.label | downcase }}</h2></div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {% for opt in browse_facet.options %}
        {% assign n = 0 %}{% for e in entries %}{% assign v = e[browse_facet.key] %}{% if v == opt %}{% assign n = n | plus: 1 %}{% elsif v.first and v contains opt %}{% assign n = n | plus: 1 %}{% endif %}{% endfor %}
        <a class="card group flex items-center justify-between gap-3 p-5 transition hover:-translate-y-0.5 hover:border-brand-primary/40" href="{{ catalog_url | relative_url }}?{{ browse_facet.key | replace: '_', '-' }}={{ opt | slugify }}">
          <span class="font-semibold text-brand-primary-dark group-hover:text-brand-primary">{{ opt }}</span>
          <span class="chip-neutral">{{ n }}</span>
        </a>
      {% endfor %}
    </div>
  </section>
  {% endif %}

  {% if cfg.modules.catalog %}
  <!-- Recently added -->
  <section aria-labelledby="recent-heading">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><span class="eyebrow">Latest</span><h2 id="recent-heading" class="section-title mt-1">Recently added</h2></div>
      <a class="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline" href="{{ catalog_url | relative_url }}">Browse all {{ total }} {{ plural | downcase }} {% include icon.html name='arrow-right' size='sm' %}</a>
    </div>
    {% assign recent_count = cfg.home.recent_count | default: 6 %}
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {% for e in entries limit: recent_count %}{% include entry-card.html entry=e %}{% endfor %}
    </div>
    {% if total == 0 %}{% include empty-state.html icon='sparkles' title='Nothing published yet' body='Once the first entries are approved they will show up here.' cta_url='/submit/' cta_label='Submit the first one' %}{% endif %}
  </section>
  {% endif %}

  {% if cfg.modules.events or cfg.modules.cohorts %}
  <section class="grid gap-8 lg:grid-cols-2">
    {% if cfg.modules.events %}
    <div class="card" aria-labelledby="events-heading">
      <div class="card-header flex items-center justify-between"><h2 id="events-heading" class="card-title">Upcoming events</h2><a class="text-sm font-semibold text-brand-primary hover:underline" href="{{ '/events/' | relative_url }}">Full calendar</a></div>
      <div class="px-6">
        {% if upcoming.size > 0 %}{% include event-list.html events=upcoming limit=4 compact=true %}{% else %}<p class="py-6 text-sm text-brand-muted">No upcoming events scheduled.</p>{% endif %}
      </div>
    </div>
    {% endif %}
    {% if cfg.modules.cohorts %}
    <div class="card" aria-labelledby="cohorts-heading">
      <div class="card-header flex items-center justify-between"><h2 id="cohorts-heading" class="card-title">Cohorts</h2><a class="text-sm font-semibold text-brand-primary hover:underline" href="{{ '/cohorts/' | relative_url }}">All cohorts</a></div>
      <ul class="divide-y divide-brand-line px-6">
        {% assign cohorts = site.data.cohorts | sort %}
        {% for c in cohorts reversed limit: 4 %}
          {% assign year = c[0] %}{% assign n = entries | where: 'cohort', year | size %}
          <li class="flex items-center justify-between py-4"><a class="font-semibold text-brand-primary-dark hover:text-brand-primary hover:underline" href="{{ '/cohorts/' | append: year | append: '/' | relative_url }}">Cohort {{ year }}</a><span class="chip-neutral">{{ n }} {{ plural | downcase }}</span></li>
        {% endfor %}
      </ul>
    </div>
    {% endif %}
  </section>
  {% endif %}

  {% if cfg.home.highlights and cfg.home.highlights.size > 0 %}
  <section aria-label="Why this catalog">
    <div class="grid gap-6 md:grid-cols-3">
      {% for h in cfg.home.highlights %}
        <div class="card p-6">
          <span class="eyebrow">{{ h.eyebrow }}</span>
          <h3 class="mt-3 font-heading text-xl font-semibold text-brand-primary-dark">{{ h.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-brand-muted">{{ h.body }}</p>
        </div>
      {% endfor %}
    </div>
  </section>
  {% endif %}

  {% if cfg.modules.submit %}
  <section class="relative overflow-hidden rounded-3xl bg-brand-primary px-6 py-12 text-white sm:px-10">
    <div class="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" aria-hidden="true"></div>
    <div class="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div><h2 class="font-heading text-2xl font-semibold sm:text-3xl">Have a {{ singular | downcase }} to share?</h2><p class="mt-2 max-w-xl text-white/85">Fill out a short form. Maintainers review every submission before it goes live.</p></div>
      <a class="btn-primary !bg-white !text-brand-primary-dark hover:!bg-brand-on-dark" href="{{ '/submit/' | relative_url }}">Submit a {{ singular | downcase }} {% include icon.html name='arrow-right' size='sm' %}</a>
    </div>
  </section>
  {% endif %}
</div>
