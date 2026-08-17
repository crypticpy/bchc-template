# frozen_string_literal: true

# Module toggles (_data/site.yml → modules) hide navigation links, but the
# pages themselves would still be built and indexed. This hook removes pages
# that belong to a disabled module so they never ship (or show up in search /
# the sitemap). Turn a module back on and the pages return on the next build.
Jekyll::Hooks.register :site, :post_read do |site|
  modules = (site.data["site"] || {})["modules"] || {}
  scoped = {
    "cohorts"   => %w[/cohorts/],
    "events"    => %w[/events/],
    "resources" => %w[/resources/],
    "submit"    => %w[/submit/],
    "catalog"   => ["/#{(site.data.dig('schema', 'entry', 'path') || 'catalog')}/"],
  }
  disabled = scoped.select { |name, _| modules.key?(name) && !modules[name] }.values.flatten
  next if disabled.empty?

  site.pages.reject! do |page|
    url = page.url.to_s
    disabled.any? { |prefix| url.start_with?(prefix) }
  end
end
