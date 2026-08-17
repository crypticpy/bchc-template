# frozen_string_literal: true

# Liquid filters used to turn _data/theme.yml into CSS custom properties and to
# help layouts render schema-driven content.
#
# Registered globally via `Liquid::Template.register_filter` below, so every
# layout/include can call these as Liquid filters from the moment Jekyll
# starts rendering templates at build time. Input: whatever value/args Liquid
# passes in (theme hex colors, field values, URLs). Output: plain strings
# Liquid can print directly into CSS/HTML attributes.
module CatalogTemplate
  module ThemeFilters
    # "#1D4E89" -> "29 78 137" (RGB channel triple for `rgb(var(--x) / alpha)`).
    # @param hex [String] a 3- or 6-digit hex color, with or without leading "#"
    # @return [String] "R G B" channel triple, or "0 0 0" when unparsable
    # @example
    #   :root { --brand: {{ site.data.theme.colors.brand | hex_to_rgb }}; }
    def hex_to_rgb(hex)
      value = hex.to_s.strip.delete_prefix("#")
      value = value.chars.map { |c| c * 2 }.join if value.length == 3
      return "0 0 0" unless value.match?(/\A\h{6}\z/)

      value.scan(/../).map { |pair| pair.to_i(16) }.join(" ")
    end

    # Turn a schema field value into a comma-separated list of slugs for
    # data-facet-* attributes. Accepts strings, arrays, or nil.
    # @param value [Object] a scalar, array, or nil field value
    # @return [String] comma-separated slugs, "" when the value is empty
    # @example
    #   <div data-facet-status="{{ entry.status | facet_values }}">
    def facet_values(value)
      Array(value).flatten.compact.map(&:to_s).reject { |v| v.strip.empty? }.map { |v| Jekyll::Utils.slugify(v) }.join(",")
    end

    # Alias so templates read naturally.
    # @param value [Object] a scalar, array, or nil field value
    # @return [Array<String>] slugified values
    # @example
    #   {% for slug in entry.tags | slugify_list %}
    def slugify_list(value)
      Array(value).flatten.compact.map(&:to_s).reject { |v| v.strip.empty? }.map { |v| Jekyll::Utils.slugify(v) }
    end

    # Human-readable label for a URL host: "github.com" -> "GitHub"
    # @param url [String] an http(s) URL
    # @return [String] the host with a leading "www." stripped, "" when unparsable
    # @example
    #   {{ link.url | link_host }}
    def link_host(url)
      host = URI.parse(url.to_s).host.to_s.sub(/\Awww\./, "")
      return "" if host.empty?

      host
    rescue URI::InvalidURIError
      ""
    end

    # Encode a string for use in a URL query component (Liquid's url_encode
    # turns spaces into +, which GitHub does not decode inside issue form fields).
    # @param value [String]
    # @return [String] percent-encoded string
    # @example
    #   href="https://github.com/.../issues/new?title={{ entry.title | query_encode }}"
    def query_encode(value)
      ERB::Util.url_encode(value.to_s)
    end
  end
end

require "erb"
Liquid::Template.register_filter(CatalogTemplate::ThemeFilters)
