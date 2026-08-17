# frozen_string_literal: true

# Unit tests for _plugins/schema_filters.rb's Liquid filters.
#
#   npm run test:ruby     (or: ruby -Itest test/plugins/schema_filters_test.rb)
#
# `liquid` must be loaded before the plugin file, since it registers itself
# with `Liquid::Template.register_filter` at load time. The filters themselves
# are plain instance methods on `CatalogTemplate::SchemaFilters`, so they are
# exercised here by mixing the module into a throwaway host class rather than
# by building a Liquid template/context.

require "minitest/autorun"
require "liquid"

require_relative "../../_plugins/schema_filters"

class SchemaFiltersHost
  include CatalogTemplate::SchemaFilters
end

class SchemaFiltersTest < Minitest::Test
  def setup
    @filters = SchemaFiltersHost.new
  end

  # -- sort_by_weight --------------------------------------------------------

  def test_sort_by_weight_orders_by_weight_then_keeps_relative_order_among_equals
    fields = [
      { "key" => "c", "weight" => 3 },
      { "key" => "a", "weight" => 1 },
      { "key" => "b1" },
      { "key" => "b2" }
    ]
    result = @filters.sort_by_weight(fields).map { |f| f["key"] }
    assert_equal %w[a c b1 b2], result
  end

  def test_sort_by_weight_is_nil_safe
    assert_equal [], @filters.sort_by_weight(nil)
  end

  # -- facet_fields / form_fields --------------------------------------------

  def test_facet_fields_keeps_only_facet_true_and_weight_sorts
    fields = [
      { "key" => "a", "facet" => true, "weight" => 5 },
      { "key" => "b", "facet" => false },
      { "key" => "c", "facet" => true, "weight" => 1 }
    ]
    assert_equal %w[c a], @filters.facet_fields(fields).map { |f| f["key"] }
  end

  def test_form_fields_excludes_only_form_false
    fields = [
      { "key" => "a", "form" => false },
      { "key" => "b" },
      { "key" => "c", "form" => true }
    ]
    assert_equal %w[b c], @filters.form_fields(fields).map { |f| f["key"] }
  end

  # -- fields_in_group --------------------------------------------------------

  def test_fields_in_group_matches_group_key_and_defaults_to_other
    fields = [
      { "key" => "a", "group" => "reuse" },
      { "key" => "b" },
      { "key" => "c", "group" => "reuse" }
    ]
    assert_equal %w[a c], @filters.fields_in_group(fields, "reuse").map { |f| f["key"] }
    assert_equal %w[b], @filters.fields_in_group(fields, "other").map { |f| f["key"] }
  end

  # -- groups_for --------------------------------------------------------------

  def test_groups_for_keeps_schema_order_and_only_used_groups
    groups = [
      { "key" => "about", "title" => "About" },
      { "key" => "reuse", "title" => "Reuse" },
      { "key" => "unused", "title" => "Unused" }
    ]
    fields = [{ "group" => "reuse" }, { "group" => "about" }]
    result = @filters.groups_for(groups, fields)
    assert_equal %w[about reuse], result.map { |g| g["key"] }
  end

  def test_groups_for_synthesizes_leftover_groups_not_in_schema
    fields = [{ "group" => "mystery_group" }]
    result = @filters.groups_for([], fields)
    assert_equal 1, result.length
    assert_equal "mystery_group", result.first["key"]
    refute_empty result.first["title"]
  end

  def test_groups_for_labels_ungrouped_fields_more
    fields = [{}]
    result = @filters.groups_for([], fields)
    assert_equal "other", result.first["key"]
    assert_equal "More", result.first["title"]
  end

  # -- groups_placed --------------------------------------------------------

  def test_groups_placed_defaults_missing_placement_to_main
    groups = [{ "key" => "a" }, { "key" => "b", "placement" => "rail" }]
    assert_equal %w[a], @filters.groups_placed(groups, "main").map { |g| g["key"] }
    assert_equal %w[b], @filters.groups_placed(groups, "rail").map { |g| g["key"] }
  end

  def test_groups_placed_treats_unrecognised_placement_as_main
    groups = [{ "key" => "a", "placement" => "sidebar" }]
    assert_equal %w[a], @filters.groups_placed(groups, "main").map { |g| g["key"] }
    assert_empty @filters.groups_placed(groups, "rail")
  end

  # -- card_slot / card_fields ------------------------------------------------

  def test_card_slot_resolves_true_via_type_default
    assert_equal "badge", @filters.card_slot({ "type" => "select", "card" => true })
    assert_equal "meta", @filters.card_slot({ "type" => "text", "card" => true })
    assert_equal "chip", @filters.card_slot({ "type" => "list", "card" => true })
  end

  def test_card_slot_returns_nil_for_falsy_or_unknown_type_default
    assert_nil @filters.card_slot({ "card" => false })
    assert_nil @filters.card_slot({ "card" => nil })
    assert_nil @filters.card_slot({ "type" => "url", "card" => true })
  end

  def test_card_slot_accepts_explicit_slot_names
    assert_equal "icon", @filters.card_slot({ "card" => "icon" })
    assert_nil @filters.card_slot({ "card" => "not_a_slot" })
  end

  def test_card_slot_is_nil_safe_for_non_hash_input
    assert_nil @filters.card_slot(nil)
    assert_nil @filters.card_slot("not a field")
  end

  def test_card_fields_filters_by_resolved_slot
    fields = [
      { "key" => "a", "card" => "badge" },
      { "key" => "b", "type" => "select", "card" => true },
      { "key" => "c", "card" => "chip" }
    ]
    assert_equal %w[a b], @filters.card_fields(fields, "badge").map { |f| f["key"] }
  end

  # -- option_meta / option_short ---------------------------------------------

  def test_option_meta_fills_defaults_when_unset
    field = { "icon" => "globe" }
    meta = @filters.option_meta(field, "Public-facing")
    assert_equal "Public-facing", meta["value"]
    assert_equal "Public-facing", meta["short"]
    assert_equal "globe", meta["icon"]
    assert_equal "neutral", meta["tone"]
    assert_equal "", meta["description"]
  end

  def test_option_meta_uses_declared_overrides
    field = {
      "icon" => "globe",
      "option_meta" => {
        "Public-facing" => { "short" => "Public", "icon" => "eye", "tone" => "primary", "description" => "Everyone." }
      }
    }
    meta = @filters.option_meta(field, "Public-facing")
    assert_equal "Public", meta["short"]
    assert_equal "eye", meta["icon"]
    assert_equal "primary", meta["tone"]
    assert_equal "Everyone.", meta["description"]
  end

  def test_option_meta_is_nil_safe
    meta = @filters.option_meta(nil, nil)
    assert_equal "", meta["value"]
    assert_equal "", meta["short"]
  end

  def test_option_short_delegates_to_option_meta
    field = { "option_meta" => { "x" => { "short" => "X!" } } }
    assert_equal "X!", @filters.option_short(field, "x")
    assert_equal "y", @filters.option_short(field, "y")
  end

  # -- as_list ------------------------------------------------------------------

  def test_as_list_normalises_scalars_arrays_and_blanks
    assert_equal ["a"], @filters.as_list("a")
    assert_equal %w[a b], @filters.as_list(["a", "b", "", nil, "  "])
    assert_equal [], @filters.as_list(nil)
  end

  # -- image_item / first_image -------------------------------------------------

  def test_image_item_normalises_string_and_hash_forms
    assert_equal({ "src" => "a.png", "alt" => "fallback" }, @filters.image_item("a.png", "fallback"))
    assert_equal(
      { "src" => "a.png", "alt" => "custom" },
      @filters.image_item({ "src" => "a.png", "alt" => "custom" }, "fallback")
    )
    assert_equal(
      { "src" => "a.png", "alt" => "fallback" },
      @filters.image_item({ "src" => "a.png" }, "fallback")
    )
  end

  def test_first_image_reads_first_entry_of_either_shape
    assert_equal "a.png", @filters.first_image(["a.png", "b.png"])
    assert_equal "a.png", @filters.first_image([{ "src" => "a.png" }])
    assert_equal "", @filters.first_image(nil)
    assert_equal "", @filters.first_image([])
  end
end
