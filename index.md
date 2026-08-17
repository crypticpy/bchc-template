---
layout: default
title: "Home"
include_carousel: true
full_width: true
---
{%- comment -%}
Home page. Above the fold: what the collection is, a search box that submits into
the catalog, and browse-by tiles built from the card-facing facet fields. Then
featured/recent cards and an honest stat line — every number is counted from the
entries, never invented. All labels come from _data/schema.yml.
{%- endcomment -%}
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
{%- assign facet_fields = schema.fields | facet_fields -%}

{%- comment -%}
Browse-by: up to four facet fields with fixed options. Fields that also appear on the
card as a badge, chip or signal glyph come first, in schema order — those are the taxonomy the site
leads with; remaining facets fill in only if fewer than four qualify.
{%- endcomment -%}
{%- assign browse_fields = "" | split: "" -%}
{%- for f in schema.fields -%}
  {%- if f.facet and f.options and f.card and f.card != 'meta' and browse_fields.size < 4 -%}{%- assign browse_fields = browse_fields | push: f -%}{%- endif -%}
{%- endfor -%}
{%- for f in facet_fields -%}
  {%- if f.options and browse_fields.size < 4 -%}
    {%- unless browse_fields contains f -%}{%- assign browse_fields = browse_fields | push: f -%}{%- endunless -%}
  {%- endif -%}
{%- endfor -%}

{%- comment -%} Honest stats, counted from the entries. {%- endcomment -%}
{%- assign meta_field = schema.fields | card_fields: 'meta' | first -%}
{%- assign meta_values = "" | split: "" -%}
{%- if meta_field -%}
  {%- for e in entries -%}
    {%- assign vals = e[meta_field.key] | as_list -%}
    {%- for x in vals -%}{%- assign meta_values = meta_values | push: x -%}{%- endfor -%}
  {%- endfor -%}
{%- endif -%}
{%- assign meta_count = meta_values | uniq | size -%}
{%- assign meta_label = meta_field.label | downcase -%}
{%- assign meta_last = meta_label | slice: -1 -%}
{%- unless meta_last == 's' -%}{%- assign meta_label = meta_label | append: 's' -%}{%- endunless -%}
{%- assign url_field = schema.fields | where: 'type', 'url' | first -%}
{%- assign url_count = 0 -%}
{%- if url_field -%}
  {%- for e in entries -%}
    {%- assign uv = e[url_field.key] -%}
    {%- if uv and uv != '' -%}{%- assign url_count = url_count | plus: 1 -%}{%- endif -%}
  {%- endfor -%}
{%- endif -%}
{%- assign upcoming = site.data.events_all | where: 'past', false -%}

{%- assign hero_latest_count = cfg.home.hero_latest_count | default: 3 -%}
{%- assign hero_latest = "" | split: "" -%}
{%- if cfg.modules.catalog and hero_latest_count > 0 -%}{%- assign hero_latest = entries | slice: 0, hero_latest_count -%}{%- endif -%}
{%- assign hero_meta_field = schema.fields | card_fields: 'meta' | first -%}

<section class="bg-brand-primary-dark text-brand-on-dark">
  <div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-16 lg:px-8 lg:py-20">
    <div class="max-w-prose">
      {% if cfg.hero.eyebrow %}<p class="eyebrow !text-brand-on-dark/80">{{ cfg.hero.eyebrow }}</p>{% endif %}
      <h1 class="mt-3 font-heading text-[40px] font-semibold leading-[44px] tracking-[-0.02em] text-white">{{ cfg.hero.title | default: cfg.name }}</h1>
      {% if cfg.hero.lead %}<p class="mt-4 text-lg leading-7 text-brand-on-dark/90">{{ cfg.hero.lead }}</p>{% endif %}

      {% if cfg.modules.catalog %}
      <form class="mt-6 flex flex-col gap-3 sm:flex-row" action="{{ catalog_url | relative_url }}" method="get" role="search">
        <div class="relative flex-1">
          <label class="sr-only" for="home-search">Search {{ plural | downcase }}</label>
          <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-brand-muted">{% include icon.html name='search' size='sm' %}</span>
          <input class="h-12 w-full rounded-full border border-brand-line bg-surface-card pl-11 pr-4 text-base text-brand-ink placeholder:text-brand-muted focus:border-brand-primary focus:outline-none focus:ring-4 focus:ring-white/40" id="home-search" type="search" name="q" placeholder="Search {{ plural | downcase }}…" autocomplete="off">
        </div>
        <button class="btn-primary !bg-white !text-brand-primary-dark hover:!bg-brand-on-dark" type="submit">Search</button>
      </form>
      {% endif %}

      <div class="mt-5 flex flex-wrap gap-3">
        {% if cfg.hero.primary_cta.label %}<a class="btn-on-dark" href="{{ cfg.hero.primary_cta.url | relative_url }}">{{ cfg.hero.primary_cta.label }} {% include icon.html name='arrow-right' size='sm' %}</a>{% endif %}
        {% if cfg.hero.secondary_cta.label %}{% assign sec_url = cfg.hero.secondary_cta.url %}{% if sec_url != '/submit/' or cfg.modules.submit %}<a class="btn-on-dark" href="{{ sec_url | relative_url }}">{{ cfg.hero.secondary_cta.label }}</a>{% endif %}{% endif %}
      </div>

      {% if cfg.modules.stats and total > 0 %}
      <p class="mt-8 text-sm text-brand-on-dark/80">
        <span class="font-semibold text-white tabular">{{ total }}</span> {{ plural | downcase }}
        {% if meta_field and meta_count > 0 %}<span class="hero-stat"><span class="font-semibold text-white tabular">{{ meta_count }}</span> {{ meta_label }}</span>{% endif %}
        {% if url_field and url_count > 0 %}<span class="hero-stat"><span class="font-semibold text-white tabular">{{ url_count }}</span> with {{ url_field.label | downcase }}</span>{% endif %}
      </p>
      {% endif %}
    </div>

    {%- if hero_latest.size > 0 %}
    <aside class="hero-latest hidden lg:block" aria-labelledby="hero-latest-heading">
      <p class="eyebrow !text-brand-on-dark/80" id="hero-latest-heading">Latest additions</p>
      <ul role="list" class="mt-3 divide-y divide-white/10">
        {%- for hl in hero_latest %}
        {%- assign hl_meta = '' -%}
        {%- if hero_meta_field -%}{%- assign hl_vals = hl[hero_meta_field.key] | as_list -%}{%- if hl_vals.size > 0 -%}{%- assign hl_meta = hero_meta_field | option_short: hl_vals[0] -%}{%- endif -%}{%- endif -%}
        <li class="hero-latest-item">
          <a class="hero-latest-link" href="{{ hl.url | relative_url }}">
            <span class="hero-latest-title">{{ hl.title | escape }}</span>
            <span class="hero-latest-meta">{% if hl_meta != '' %}<span>{{ hl_meta | escape }}</span>{% endif %}<time datetime="{{ hl.published | date: '%Y-%m-%d' }}">{{ hl.published | date: '%b %-d, %Y' }}</time></span>
          </a>
        </li>
        {%- endfor %}
      </ul>
      <a class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white underline-offset-4 hover:underline" href="{{ catalog_url | relative_url }}">See all {{ total }} {{ plural | downcase }} {% include icon.html name='arrow-right' size='sm' %}</a>
    </aside>
    {%- endif %}
  </div>
</section>

<div class="mx-auto w-full max-w-7xl space-y-16 px-4 py-14 sm:px-6 lg:px-8">

  {% if cfg.modules.catalog and browse_fields.size > 0 %}
  <section aria-labelledby="browse-heading">
    <h2 id="browse-heading" class="section-title">Browse by</h2>
    <div class="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {% for bf in browse_fields %}
        {% assign bkey = bf.key | replace: '_', '-' %}
        <div class="card p-5">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-primary-dark">{% include icon.html name=bf.icon size='sm' class='text-brand-muted' %}{{ bf.label }}</h3>
          <ul role="list" class="mt-3 space-y-1">
            {% for opt in bf.options limit: 6 %}
              {% assign om = bf | option_meta: opt %}{% assign own = bf.option_meta[opt] %}
              <li><a class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-primary transition-colors duration-120 ease-brand hover:bg-brand-primary/5 hover:underline" href="{{ catalog_url | relative_url }}?{{ bkey }}={{ opt | slugify }}" title="{{ opt | escape }}">{% if own.icon %}{% include icon.html name=own.icon size='xs' class='text-brand-muted' %}{% endif %}{{ om.short }}</a></li>
            {% endfor %}
          </ul>
          {% if bf.options.size > 6 %}<a class="mt-2 inline-block px-2 text-xs font-semibold text-brand-primary hover:underline" href="{{ catalog_url | relative_url }}">All {{ bf.options.size }} options</a>{% endif %}
        </div>
      {% endfor %}
    </div>
  </section>
  {% endif %}

  {% if cfg.modules.carousel and featured.size > 0 %}
  <section aria-labelledby="featured-heading" data-carousel>
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 id="featured-heading" class="section-title">Featured {{ plural | downcase }}</h2>
      <div class="flex items-center gap-2">
        <button type="button" class="icon-btn border border-brand-line-strong" data-carousel-prev aria-label="Previous">{% include icon.html name='chevron-left' size='sm' %}</button>
        <button type="button" class="icon-btn border border-brand-line-strong" data-carousel-next aria-label="Next">{% include icon.html name='chevron-right' size='sm' %}</button>
      </div>
    </div>
    <ul role="list" class="no-scrollbar -mx-4 flex list-none snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 sm:mx-0 sm:px-0 [&>li]:w-[85%] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[48%] xl:[&>li]:w-[32%]" data-carousel-track tabindex="0" aria-label="Featured {{ plural | downcase }}">
      {% for e in featured %}{% assign home_eager = false %}{% if forloop.index <= 3 %}{% assign home_eager = true %}{% endif %}{% include entry-card.html entry=e eager=home_eager %}{% endfor %}
    </ul>
  </section>
  {% endif %}

  {% if cfg.modules.catalog %}
  <section aria-labelledby="recent-heading">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 id="recent-heading" class="section-title">Recently added</h2>
      <a class="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline" href="{{ catalog_url | relative_url }}">Browse all {{ total }} {{ plural | downcase }} {% include icon.html name='arrow-right' size='sm' %}</a>
    </div>
    {% assign recent_count = cfg.home.recent_count | default: 6 %}
    <ul role="list" class="entry-grid">
      {% for e in entries limit: recent_count %}{% include entry-card.html entry=e %}{% endfor %}
    </ul>
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
  <section aria-label="About this catalog">
    <div class="grid gap-6 md:grid-cols-3">
      {% for h in cfg.home.highlights %}
        <div class="card p-6">
          <p class="eyebrow">{{ h.eyebrow }}</p>
          <h2 class="mt-3 font-heading text-xl font-semibold text-brand-primary-dark">{{ h.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-brand-muted">{{ h.body }}</p>
        </div>
      {% endfor %}
    </div>
  </section>
  {% endif %}

  {% if cfg.modules.submit %}
  <section class="card flex flex-col gap-4 p-8 md:flex-row md:items-center md:justify-between">
    <div class="max-w-prose">
      <h2 class="font-heading text-2xl font-semibold text-brand-primary-dark">Have a {{ singular | downcase }} to share?</h2>
      <p class="mt-2 text-sm leading-6 text-brand-muted">Fill out a short form. Maintainers review every submission before it goes live.</p>
    </div>
    <a class="btn-primary shrink-0" href="{{ '/submit/' | relative_url }}">Submit a {{ singular | downcase }} {% include icon.html name='arrow-right' size='sm' %}</a>
  </section>
  {% endif %}
</div>
