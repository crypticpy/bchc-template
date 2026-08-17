# frozen_string_literal: true

require "json"
require "fileutils"
require "time"

# Generates /search.json for the client-side Lunr search. Which fields are
# indexed comes from _data/schema.yml (fields with `search: true`), plus
# title and summary which are always included. Events and cohort pages are
# indexed too so site search finds them.
#
# SearchIndexGenerator runs as a Jekyll::Generator (`generate` hook, priority
# :low so it runs after other generators/pages have populated `site.pages`,
# e.g. entry/event/cohort pages). Input: `site.data["schema"]["fields"]` and
# the rendered `site.pages` (title/summary/body front matter). Output: a
# SearchIndexFile added to `site.static_files`, written to `/search.json` at
# `Jekyll::StaticFile#write` time (Jekyll's normal static-file write pass).
module CatalogTemplate
  # A Jekyll::StaticFile whose content is computed in memory (the search
  # index payload) rather than copied from a file on disk.
  class SearchIndexFile < Jekyll::StaticFile
    # @param site [Jekyll::Site]
    # @param payload [Hash] the JSON-serializable search index ({generated_at:, docs:})
    def initialize(site, payload)
      super(site, site.source, "", "search.json")
      @payload = payload
    end

    # Writes the payload as JSON to `dest/search.json`.
    # @param dest [String] destination directory (Jekyll's `_site` by default)
    # @return [Boolean] true on success (Jekyll::StaticFile#write contract)
    def write(dest)
      dest_path = destination(dest)
      FileUtils.mkdir_p(File.dirname(dest_path))
      File.write(dest_path, JSON.generate(@payload))
      true
    end
  end

  class SearchIndexGenerator < Jekyll::Generator
    safe true
    priority :low

    # Builds the search payload from indexable pages and queues it for write.
    # @param site [Jekyll::Site]
    # @return [void]
    def generate(site)
      schema = site.data["schema"] || {}
      fields = Array(schema["fields"])
      searchable = fields.select { |f| f["search"] || f["facet"] }.map { |f| f["key"] }
      searchable = (%w[title summary] + searchable).uniq

      baseurl = site.config["baseurl"].to_s.chomp("/")
      docs = []
      site.pages.each do |page|
        case page.data["layout"]
        when "entry"
          text = searchable.map { |k| Array(page.data[k]).flatten.compact.join(" ") }.join(" ")
          text = [text, body_text(page)].reject(&:empty?).join(" ")
          docs << {
            id: page.data["slug"] || Jekyll::Utils.slugify(page.data["title"].to_s),
            title: page.data["title"],
            summary: page.data["summary"],
            text: text,
            url: baseurl + page.url,
            kind: "entry"
          }
        when "event"
          docs << {
            id: "event:#{page.data['cohort']}:#{page.data['event_id']}",
            title: page.data["title"],
            summary: page.data["summary"],
            text: [page.data["event_location"], page.data["cohort"]].compact.join(" "),
            url: baseurl + page.url,
            kind: "event"
          }
        when "cohort"
          docs << {
            id: "cohort:#{page.data['year']}",
            title: page.data["title"],
            summary: page.data["intro"],
            text: page.data["year"].to_s,
            url: baseurl + page.url,
            kind: "cohort"
          }
        end
      end

      payload = { generated_at: Time.now.utc.iso8601, docs: docs }
      site.static_files << SearchIndexFile.new(site, payload)
    end

    # Maximum characters of an entry's prose kept in the index, per entry.
    BODY_CHARS = 2_000

    # The write-up (the schema's `markdown` body field) is where the detail lives,
    # so it belongs in the index — but only as plain words. Liquid tags, HTML and
    # Markdown punctuation are dropped and the result is capped at BODY_CHARS so
    # search.json stays small enough to fetch on a phone.
    #
    # @param page [Jekyll::Page] an entry page, read before Liquid rendering
    # @return [String] normalized prose, at most BODY_CHARS characters
    def body_text(page)
      raw = page.content.to_s
      return "" if raw.empty?

      raw = raw.gsub(/\{%.*?%\}/m, " ")       # Liquid tags
               .gsub(/\{\{.*?\}\}/m, " ")     # Liquid output
               .gsub(/```.*?```/m, " ")       # fenced code
               .gsub(/<[^>]+>/, " ")          # inline HTML
               .gsub(/[#*_`>\[\]()|!]+/, " ") # Markdown punctuation
               .gsub(/\s+/, " ")
               .strip
      raw.length > BODY_CHARS ? raw[0, BODY_CHARS] : raw
    end
  end
end
