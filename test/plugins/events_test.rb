# frozen_string_literal: true

# Unit tests for _plugins/events.rb's CatalogTemplate::EventsAggregator.
#
#   npm run test:ruby     (or: ruby -Itest test/plugins/events_test.rb)
#
# `jekyll` must be loaded first: the plugin subclasses Jekyll::Generator and
# calls Jekyll::Utils.slugify. The generator is exercised directly against a
# lightweight `EventsFakeSite` double (responds to `data` and `pages`, like the
# subset of Jekyll::Site the generator actually touches) instead of building a
# real Jekyll::Site.

require "minitest/autorun"
require "jekyll"
require "date"

require_relative "../../_plugins/events"

EventsFakeSite = Struct.new(:data, :pages)
EventsFakePage = Struct.new(:url)

class EventsAggregatorTest < Minitest::Test
  def setup
    @generator = CatalogTemplate::EventsAggregator.new
  end

  def build_site(events: [], cohorts: {}, pages: [])
    EventsFakeSite.new({ "events" => events, "cohorts" => cohorts }, pages)
  end

  def test_merges_site_and_cohort_events_into_events_all
    site = build_site(
      events: [{ "name" => "Site Wide", "date" => "2020-01-01" }],
      cohorts: {
        2024 => { "events" => [{ "name" => "Cohort Kickoff", "date" => "2024-03-01" }] }
      }
    )
    @generator.generate(site)

    names = site.data["events_all"].map { |e| e["name"] }
    assert_equal ["Site Wide", "Cohort Kickoff"].sort, names.sort
  end

  def test_sorts_by_date_then_name
    site = build_site(
      events: [
        { "name" => "Zebra", "date" => "2024-01-01" },
        { "name" => "Alpha", "date" => "2024-01-01" },
        { "name" => "Earlier", "date" => "2023-01-01" }
      ]
    )
    @generator.generate(site)

    dates_and_names = site.data["events_all"].map { |e| [e["date"], e["name"]] }
    assert_equal [["2023-01-01", "Earlier"], ["2024-01-01", "Alpha"], ["2024-01-01", "Zebra"]], dates_and_names
  end

  def test_tags_source_and_cohort
    site = build_site(
      events: [{ "name" => "Site Event", "date" => "2024-01-01" }],
      cohorts: { "2024" => { "events" => [{ "name" => "Cohort Event", "date" => "2024-01-01" }] } }
    )
    @generator.generate(site)

    by_name = site.data["events_all"].each_with_object({}) { |e, h| h[e["name"]] = e }
    assert_equal "site", by_name["Site Event"]["source"]
    assert_nil by_name["Site Event"]["cohort"]
    assert_equal "cohort", by_name["Cohort Event"]["source"]
    assert_equal "2024", by_name["Cohort Event"]["cohort"]
  end

  def test_page_url_is_set_only_when_a_matching_cohort_event_page_exists
    site = build_site(
      cohorts: {
        "2024" => {
          "events" => [
            { "slug" => "kickoff", "name" => "Kickoff", "date" => "2024-01-01" },
            { "slug" => "no-page", "name" => "No Page", "date" => "2024-01-02" }
          ]
        }
      },
      pages: [EventsFakePage.new("/cohorts/2024/events/kickoff/")]
    )
    @generator.generate(site)

    by_name = site.data["events_all"].each_with_object({}) { |e, h| h[e["name"]] = e }
    assert_equal "/cohorts/2024/events/kickoff/", by_name["Kickoff"]["page_url"]
    assert_nil by_name["No Page"]["page_url"]
  end

  def test_ignores_entries_without_a_date_or_that_are_not_hashes
    site = build_site(events: [{ "name" => "No date" }, "not a hash", { "name" => "Has date", "date" => "2024-01-01" }])
    @generator.generate(site)

    assert_equal ["Has date"], site.data["events_all"].map { |e| e["name"] }
  end

  def test_ignores_cohort_entries_that_are_not_hashes
    site = build_site(cohorts: { "2024" => "not a hash" })
    @generator.generate(site)

    assert_equal [], site.data["events_all"]
  end

  def test_past_is_computed_relative_to_today
    yesterday = (Date.today - 1).iso8601
    tomorrow = (Date.today + 1).iso8601
    site = build_site(
      events: [
        { "name" => "Past", "date" => yesterday },
        { "name" => "Future", "date" => tomorrow }
      ]
    )
    @generator.generate(site)

    by_name = site.data["events_all"].each_with_object({}) { |e, h| h[e["name"]] = e }
    assert_equal true, by_name["Past"]["past"]
    assert_equal false, by_name["Future"]["past"]
  end

  def test_past_uses_end_date_when_present
    site = build_site(
      events: [
        { "name" => "Multi-day", "date" => (Date.today - 5).iso8601, "end_date" => (Date.today + 5).iso8601 }
      ]
    )
    @generator.generate(site)

    assert_equal false, site.data["events_all"].first["past"]
  end

  def test_unparsable_dates_do_not_raise
    site = build_site(events: [{ "name" => "Bad date", "date" => "not-a-date" }])
    @generator.generate(site)

    event = site.data["events_all"].first
    assert_nil event["date"]
    assert_equal false, event["past"]
  end
end
