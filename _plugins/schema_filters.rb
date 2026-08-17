# frozen_string_literal: true

# Liquid filters that resolve `_data/schema.yml` presentation hints in one place,
# so layouts and includes never re-implement the rules (see docs/content-model.md).
#
# All filters are pure and nil-safe: they accept the raw schema `fields` array
# (or a single field hash) and return plain arrays/hashes for Liquid.
#
# Registered globally via `Liquid::Template.register_filter` below, so every
# layout/include can call these as Liquid filters (e.g. `| facet_fields`) from
# the moment Jekyll starts rendering templates at build time — there is no
# per-page opt-in. Input: schema data already loaded into `site.data.schema`
# (parsed from `_data/schema.yml`) plus whatever field/value Liquid passes in.
# Output: plain arrays/hashes/strings Liquid can iterate or print directly.
module CatalogTemplate
  module SchemaFilters
    DEFAULT_WEIGHT = 5
    # Type -> default card slot when a field says `card: true`.
    CARD_DEFAULTS = {
      "select" => "badge",
      "text" => "meta",
      "list" => "chip",
      "multiselect" => "chip"
    }.freeze
    CARD_SLOTS = %w[badge chip meta icon line].freeze
    # Where a group renders on the entry page.
    GROUP_PLACEMENTS = %w[main rail].freeze
    GROUP_PLACEMENT_DEFAULT = "main"

    # Stable sort by `weight` (default 5). Fields without weight keep their
    # relative schema order among equals.
    # @param fields [Array<Hash>]
    # @return [Array<Hash>]
    # @example
    #   {{ site.data.schema.fields | sort_by_weight }}
    def sort_by_weight(fields)
      Array(fields).each_with_index.sort_by { |f, i| [(f["weight"] || DEFAULT_WEIGHT).to_i, i] }.map(&:first)
    end

    # Fields shown in the filter panel.
    # @param fields [Array<Hash>] schema `fields`
    # @return [Array<Hash>] fields with `facet: true`, weight-sorted
    # @example
    #   {{ site.data.schema.fields | facet_fields }}
    def facet_fields(fields)
      sort_by_weight(Array(fields).select { |f| f["facet"] })
    end

    # Fields shown in submission forms (everything except `form: false`).
    # @param fields [Array<Hash>] schema `fields`
    # @return [Array<Hash>] weight-sorted fields
    # @example
    #   {{ site.data.schema.fields | form_fields }}
    def form_fields(fields)
      sort_by_weight(Array(fields).reject { |f| f["form"] == false })
    end

    # Fields whose `group` equals `key` (fields with no group belong to "other").
    # @param fields [Array<Hash>] schema `fields`
    # @param key [String] group key to match
    # @return [Array<Hash>] weight-sorted fields in that group
    # @example
    #   {{ site.data.schema.fields | fields_in_group: "impact" }}
    def fields_in_group(fields, key)
      key = key.to_s
      sort_by_weight(Array(fields).select { |f| (f["group"] || "other").to_s == key })
    end

    # Group keys actually used by the given fields, in schema `groups` order,
    # followed by "other" when needed. Returns an array of group hashes.
    # @param groups [Array<Hash>] schema-level `groups`
    # @param fields [Array<Hash>] the fields being laid out (e.g. facet_fields)
    # @return [Array<Hash>] group hashes, each at least {"key", "title"}
    # @example
    #   {{ site.data.schema.groups | groups_for: fields }}
    def groups_for(groups, fields)
      used = Array(fields).map { |f| (f["group"] || "other").to_s }.uniq
      ordered = Array(groups).select { |g| used.include?(g["key"].to_s) }
      known = ordered.map { |g| g["key"].to_s }
      leftovers = used - known
      leftovers.each { |k| ordered << { "key" => k, "title" => (k == "other" ? "More" : k.tr("_-", "  ").capitalize) } }
      ordered
    end

    # Groups whose `placement` matches, in the order given. `placement` is
    # optional on a group and anything unrecognised falls back to "main", so a
    # schema that never mentions it keeps every group in the page body.
    # @param groups [Array<Hash>] usually the output of `groups_for`
    # @param placement [String] "rail" | "main"
    # @return [Array<Hash>] the subset of `groups` matching `placement`
    # @example
    #   {{ groups | groups_placed: "rail" }}
    def groups_placed(groups, placement)
      want = placement.to_s.strip
      want = GROUP_PLACEMENT_DEFAULT unless GROUP_PLACEMENTS.include?(want)
      Array(groups).select do |g|
        actual = g.is_a?(Hash) ? g["placement"].to_s.strip : ""
        actual = GROUP_PLACEMENT_DEFAULT unless GROUP_PLACEMENTS.include?(actual)
        actual == want
      end
    end

    # Effective card slot for a field: "badge" | "chip" | "meta" | "icon" | "line" | nil.
    # @param field [Hash] a single schema field
    # @return [String, nil] the resolved slot name, or nil when `card` is falsy
    # @example
    #   {{ field | card_slot }}
    def card_slot(field)
      return nil unless field.is_a?(Hash)

      card = field["card"]
      return nil if card.nil? || card == false
      return CARD_DEFAULTS[field["type"].to_s] if card == true

      CARD_SLOTS.include?(card.to_s) ? card.to_s : nil
    end

    # Fields whose effective card slot is `slot`, sorted by weight.
    # @param fields [Array<Hash>] schema `fields`
    # @param slot [String] one of CARD_SLOTS
    # @return [Array<Hash>] matching, weight-sorted fields
    # @example
    #   {{ site.data.schema.fields | card_fields: "badge" }}
    def card_fields(fields, slot)
      sort_by_weight(Array(fields).select { |f| card_slot(f) == slot.to_s })
    end

    # Resolved presentation for one option value:
    #   { "value", "short", "icon", "tone", "description" } with defaults filled
    #   (short = value, icon = field icon, tone = "neutral").
    # @param field [Hash] the schema field the value belongs to
    # @param value [String] the raw option value
    # @return [Hash] {"value", "short", "icon", "tone", "description"}
    # @example
    #   {{ field | option_meta: entry[field.key] }}
    def option_meta(field, value)
      field = {} unless field.is_a?(Hash)
      value = value.to_s
      meta = (field["option_meta"] || {})[value]
      meta = {} unless meta.is_a?(Hash)
      {
        "value" => value,
        "short" => (meta["short"].to_s.strip.empty? ? value : meta["short"].to_s),
        "icon" => (meta["icon"].to_s.strip.empty? ? field["icon"].to_s : meta["icon"].to_s),
        "tone" => (meta["tone"].to_s.strip.empty? ? "neutral" : meta["tone"].to_s),
        "description" => meta["description"].to_s
      }
    end

    # Short label for a value (falls back to the value itself).
    # @param field [Hash] the schema field the value belongs to
    # @param value [String] the raw option value
    # @return [String] the option's `short` label, or `value` when unset
    # @example
    #   {{ field | option_short: entry[field.key] }}
    def option_short(field, value)
      option_meta(field, value)["short"]
    end

    # Normalise a scalar-or-list front matter value into an array of strings.
    # @param value [Object] a scalar, array, or nil field value
    # @return [Array<String>] non-blank string values
    # @example
    #   {{ entry.tags | as_list }}
    def as_list(value)
      Array(value).flatten.compact.map(&:to_s).reject { |v| v.strip.empty? }
    end

    # Normalise an `images` field item (string or {src, alt}) to a hash.
    # @param item [String, Hash] one entry of an `images` field's array value
    # @param fallback_alt [String] alt text to use when the item has none
    # @return [Hash] {"src", "alt"}
    # @example
    #   {{ img | image_item: entry.title }}
    def image_item(item, fallback_alt = "")
      if item.is_a?(Hash)
        { "src" => item["src"].to_s, "alt" => (item["alt"].to_s.strip.empty? ? fallback_alt.to_s : item["alt"].to_s) }
      else
        { "src" => item.to_s, "alt" => fallback_alt.to_s }
      end
    end

    # First image src of an `images` value, or "" when none.
    # @param value [Array, nil] an `images` field's value
    # @return [String] the first image's src, or "" when there isn't one
    # @example
    #   {{ entry.images | first_image }}
    def first_image(value)
      first = Array(value).first
      first.is_a?(Hash) ? first["src"].to_s : first.to_s
    end
  end
end

Liquid::Template.register_filter(CatalogTemplate::SchemaFilters)
