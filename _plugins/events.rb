# frozen_string_literal: true

require "date"

# Aggregates events from _data/events.yml (site-wide) and every _data/cohorts/YYYY.yml
# into a single normalized, date-sorted list exposed as `site.data.events_all`.
# Each item: name, date (YYYY-MM-DD), end_date, time, location, url, description,
# type, source ("site" | "cohort"), cohort, page_url (detail page if one exists), past (bool).
#
# Runs as a Jekyll::Generator (the `generate` hook, priority :high so it runs
# before other generators/pages that read `site.data.events_all`, e.g. the
# events index and search index). Input: `site.data["events"]` and
# `site.data["cohorts"]`. Output: `site.data["events_all"]`, written in place.
module CatalogTemplate
  class EventsAggregator < Jekyll::Generator
    safe true
    priority :high

    # Builds and stores the normalized event list.
    # @param site [Jekyll::Site]
    # @return [void]
    def generate(site)
      today = Date.today
      events = []

      Array(site.data["events"]).each do |ev|
        next unless ev.is_a?(Hash) && ev["date"]

        events << normalize(ev, "site", nil, nil, today)
      end

      cohorts = site.data["cohorts"] || {}
      cohorts.each do |year, data|
        next unless data.is_a?(Hash)

        Array(data["events"]).each do |ev|
          next unless ev.is_a?(Hash) && ev["date"]

          id = ev["slug"] || ev["id"] || Jekyll::Utils.slugify(ev["name"].to_s)
          page_url = "/cohorts/#{year}/events/#{id}/"
          exists = site.pages.any? { |p| p.url == page_url }
          events << normalize(ev, "cohort", year.to_s, exists ? page_url : nil, today)
        end
      end

      site.data["events_all"] = events.sort_by { |e| [e["date"], e["name"].to_s] }
    end

    private

    # Converts one raw event hash (from either _data/events.yml or a cohort's
    # `events` list) into the flat shape stored in `events_all`.
    # @param ev [Hash] raw event data
    # @param source [String] "site" or "cohort"
    # @param cohort [String, nil] cohort year, when source is "cohort"
    # @param page_url [String, nil] detail page URL, when one exists
    # @param today [Date] used to compute `past`
    # @return [Hash] normalized event
    def normalize(ev, source, cohort, page_url, today)
      date = parse_date(ev["date"])
      end_date = parse_date(ev["end_date"])
      last_day = end_date || date
      {
        "id" => (ev["id"] || ev["slug"] || Jekyll::Utils.slugify(ev["name"].to_s)).to_s,
        "name" => ev["name"].to_s,
        "date" => date&.iso8601,
        "end_date" => end_date&.iso8601,
        "month" => date&.strftime("%B %Y"),
        "time" => ev["time"],
        "location" => ev["location"],
        "url" => ev["url"] || ev["registration_url"],
        "description" => ev["description"],
        "type" => ev["type"],
        "source" => source,
        "cohort" => cohort,
        "page_url" => page_url,
        "past" => last_day ? last_day < today : false
      }
    end

    # Parses a date value that may already be a Date (Jekyll's YAML loader
    # sometimes coerces `YYYY-MM-DD` strings automatically) or a plain string.
    # @param value [Date, String, nil]
    # @return [Date, nil] nil when blank or unparsable
    def parse_date(value)
      return nil if value.nil? || value.to_s.strip.empty?
      return value if value.is_a?(Date)

      Date.parse(value.to_s)
    rescue ArgumentError
      nil
    end
  end
end
