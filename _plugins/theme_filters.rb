# frozen_string_literal: true

# Liquid filters used to turn _data/theme.yml into CSS custom properties and to
# help layouts render schema-driven content.
module CatalogTemplate
  module ThemeFilters
    # "#1D4E89" -> "29 78 137" (RGB channel triple for `rgb(var(--x) / alpha)`).
    def hex_to_rgb(hex)
      value = hex.to_s.strip.delete_prefix("#")
      value = value.chars.map { |c| c * 2 }.join if value.length == 3
      return "0 0 0" unless value.match?(/\A\h{6}\z/)

      value.scan(/../).map { |pair| pair.to_i(16) }.join(" ")
    end

    # Turn a schema field value into a comma-separated list of slugs for
    # data-facet-* attributes. Accepts strings, arrays, or nil.
    def facet_values(value)
      Array(value).flatten.compact.map(&:to_s).reject { |v| v.strip.empty? }.map { |v| Jekyll::Utils.slugify(v) }.join(",")
    end

    # Alias so templates read naturally.
    def slugify_list(value)
      Array(value).flatten.compact.map(&:to_s).reject { |v| v.strip.empty? }.map { |v| Jekyll::Utils.slugify(v) }
    end

    # Human-readable label for a URL host: "github.com" -> "GitHub"
    def link_host(url)
      host = URI.parse(url.to_s).host.to_s.sub(/\Awww\./, "")
      return "" if host.empty?

      host
    rescue URI::InvalidURIError
      ""
    end

    # Encode a string for use in a URL query component (Liquid's url_encode
    # turns spaces into +, which GitHub does not decode inside issue form fields).
    def query_encode(value)
      ERB::Util.url_encode(value.to_s)
    end
  end
end

require "erb"
Liquid::Template.register_filter(CatalogTemplate::ThemeFilters)
