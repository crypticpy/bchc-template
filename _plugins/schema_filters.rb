# frozen_string_literal: true

# Liquid filters that resolve `_data/schema.yml` presentation hints in one place,
# so layouts and includes never re-implement the rules (see docs/content-model.md).
#
# All filters are pure and nil-safe: they accept the raw schema `fields` array
# (or a single field hash) and return plain arrays/hashes for Liquid.
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
    def sort_by_weight(fields)
      Array(fields).each_with_index.sort_by { |f, i| [(f["weight"] || DEFAULT_WEIGHT).to_i, i] }.map(&:first)
    end

    # Fields shown in the filter panel.
    def facet_fields(fields)
      sort_by_weight(Array(fields).select { |f| f["facet"] })
    end

    # Fields shown in submission forms (everything except `form: false`).
    def form_fields(fields)
      sort_by_weight(Array(fields).reject { |f| f["form"] == false })
    end

    # Fields whose `group` equals `key` (fields with no group belong to "other").
    def fields_in_group(fields, key)
      key = key.to_s
      sort_by_weight(Array(fields).select { |f| (f["group"] || "other").to_s == key })
    end

    # Group keys actually used by the given fields, in schema `groups` order,
    # followed by "other" when needed. Returns an array of group hashes.
    # @param groups [Array<Hash>] schema-level `groups`
    # @param fields [Array<Hash>] the fields being laid out (e.g. facet_fields)
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
    def card_slot(field)
      return nil unless field.is_a?(Hash)

      card = field["card"]
      return nil if card.nil? || card == false
      return CARD_DEFAULTS[field["type"].to_s] if card == true

      CARD_SLOTS.include?(card.to_s) ? card.to_s : nil
    end

    # Fields whose effective card slot is `slot`, sorted by weight.
    def card_fields(fields, slot)
      sort_by_weight(Array(fields).select { |f| card_slot(f) == slot.to_s })
    end

    # Resolved presentation for one option value:
    #   { "value", "short", "icon", "tone", "description" } with defaults filled
    #   (short = value, icon = field icon, tone = "neutral").
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
    def option_short(field, value)
      option_meta(field, value)["short"]
    end

    # Normalise a scalar-or-list front matter value into an array of strings.
    def as_list(value)
      Array(value).flatten.compact.map(&:to_s).reject { |v| v.strip.empty? }
    end

    # Normalise an `images` field item (string or {src, alt}) to a hash.
    def image_item(item, fallback_alt = "")
      if item.is_a?(Hash)
        { "src" => item["src"].to_s, "alt" => (item["alt"].to_s.strip.empty? ? fallback_alt.to_s : item["alt"].to_s) }
      else
        { "src" => item.to_s, "alt" => fallback_alt.to_s }
      end
    end

    # First image src of an `images` value, or "" when none.
    def first_image(value)
      first = Array(value).first
      first.is_a?(Hash) ? first["src"].to_s : first.to_s
    end
  end
end

Liquid::Template.register_filter(CatalogTemplate::SchemaFilters)
