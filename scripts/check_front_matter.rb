#!/usr/bin/env ruby
# frozen_string_literal: true

# Validates catalog entry front matter against _data/schema.yml, plus a light
# structural check of cohort event pages. Ruby stdlib only so it can run on a
# bare `ruby/setup-ruby` runner without `bundle install`.
#
# Run directly (`ruby scripts/check_front_matter.rb`) or require it and call
# FrontMatterCheck.run — test/scripts/check_front_matter_test.rb does the latter.

require "yaml"
require "date"

# Schema-driven front matter validation for catalog entries and cohort events.
module FrontMatterCheck
  DEFAULT_ROOT = File.expand_path("..", __dir__)

  module_function

  # Repository root every path is reported relative to (overridable in tests).
  # @return [String]
  def root
    @root ||= DEFAULT_ROOT
  end

  # @param value [String]
  def root=(value)
    @root = File.expand_path(value)
  end

  # Parse YAML with the same restrictions Jekyll's safe loader applies.
  # @param text [String]
  # @param source [String] path used in the error message
  # @return [Hash]
  def load_yaml(text, source)
    YAML.safe_load(text, permitted_classes: [Date, Time], permitted_symbols: [], aliases: false) || {}
  rescue Psych::SyntaxError => e
    raise "#{source} has invalid YAML: #{e.message}"
  end

  # Split "---\nfront matter\n---\nbody" into [hash, body, front_matter_text].
  # @param path [String]
  # @return [Array(Hash, String, String)]
  def split_document(path)
    content = File.read(path)
    match = content.match(/\A---\s*\n(.*?)\n---\s*(?:\n(.*))?\z/m)
    raise "#{path} is missing YAML front matter" unless match

    parsed = load_yaml(match[1], path)
    raise "#{path}: front matter must be a mapping of keys to values, got #{parsed.class}" unless parsed.is_a?(Hash)

    [parsed, (match[2] || ""), match[1]]
  end

  # @return [Boolean] true for nil, an empty array/hash, or whitespace-only text
  def blank?(value)
    return true if value.nil?
    return value.empty? if value.is_a?(Array) || value.is_a?(Hash)

    value.to_s.strip.empty?
  end

  # @return [Boolean] true when the value parses as an ISO-8601 date
  def date?(value)
    return true if value.is_a?(Date) || value.is_a?(Time)

    Date.iso8601(value.to_s)
    true
  rescue ArgumentError, Date::Error, TypeError
    false
  end

  # 1-based line of `key:` inside the file (front matter starts on line 2), or
  # nil when the key is absent. Gives errors a "file:12" style anchor.
  # @param front_matter [String]
  # @param key [String]
  # @return [Integer, nil]
  def line_of(front_matter, key)
    index = front_matter.to_s.lines.index { |line| line.start_with?("#{key}:") }
    index && index + 2
  end

  # "catalog/x/index.md:7" when the key is present, "catalog/x/index.md" otherwise.
  # @return [String]
  def where(rel, front_matter, key)
    line = line_of(front_matter, key)
    line ? "#{rel}:#{line}" : rel
  end

  # @return [Boolean] true for http:// or https:// URLs
  #
  # These values are printed into `href`/`src` attributes, so a quote, angle
  # bracket or space would break out of the attribute. Reject them here rather
  # than relying on every template to escape.
  def http_url?(value)
    value.to_s.match?(%r{\Ahttps?://[^\s"'<>]+\z})
  end

  # Normalise an `images` item to {"src" =>, "alt" =>}; nil when unusable.
  # @param item [Object]
  # @return [Hash, nil]
  def image_item(item)
    return { "src" => item.to_s, "alt" => "" } if item.is_a?(String)
    return { "src" => item["src"].to_s, "alt" => item["alt"].to_s } if item.is_a?(Hash)

    nil
  end

  # Validate one `images` field value.
  # @param value [Object] the front matter value
  # @param ctx [Hash] {rel:, entry_dir:, key:, where:}
  # @param failures [Array<String>]
  # @param warnings [Array<String>]
  def check_images(value, ctx, failures, warnings)
    unless value.is_a?(Array)
      failures << "#{ctx[:where]}: `#{ctx[:key]}` must be a YAML list of images (a string src, or `{src, alt}`)"
      return
    end

    value.each_with_index do |raw, index|
      item = image_item(raw)
      if item.nil?
        failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` must be a string or a `{src, alt}` mapping, got #{raw.class}"
        next
      end

      src = item["src"].strip
      if src.empty?
        failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` has no `src`"
        next
      end

      if http_url?(src)
        warnings << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` points at a remote host (#{src}) — copy the file into the entry folder so the page keeps working"
      elsif src.start_with?("/")
        # Site-absolute paths resolve from the repository root; the file must be
        # inside this entry's folder so it travels with the entry.
        disk = File.join(root, src.delete_prefix("/"))
        if !File.file?(disk)
          failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` points at #{src}, which does not exist"
        elsif !File.expand_path(disk).start_with?("#{File.expand_path(ctx[:entry_dir])}/")
          failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` points outside the entry folder (#{src})"
        end
      else
        disk = File.join(ctx[:entry_dir], src)
        failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` points at #{src}, which does not exist in the entry folder" unless File.file?(disk)
      end

      warnings << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` has no `alt` text — screen readers will announce a fallback" if item["alt"].strip.empty?
    end
  end

  # Validate one `links` field value.
  # @param value [Object]
  # @param ctx [Hash] {key:, where:}
  # @param failures [Array<String>]
  def check_links(value, ctx, failures)
    unless value.is_a?(Array)
      failures << "#{ctx[:where]}: `#{ctx[:key]}` must be a YAML list of links (`{label, url}`)"
      return
    end

    value.each_with_index do |raw, index|
      if raw.is_a?(String)
        failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` is not a URL (#{raw.inspect}); use `{label, url}`" unless http_url?(raw) || raw.start_with?("mailto:")
        next
      end
      unless raw.is_a?(Hash)
        failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` must be a `{label, url}` mapping, got #{raw.class}"
        next
      end

      url = raw["url"].to_s.strip
      failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` has no `label`" if raw["label"].to_s.strip.empty?
      if url.empty?
        failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` has no `url`"
      elsif !http_url?(url) && !url.start_with?("mailto:")
        failures << "#{ctx[:where]}: `#{ctx[:key]}[#{index}]` must be an http(s) or mailto: URL (got #{url.inspect})"
      end
    end
  end

  # Validate a single entry file.
  # @param file [String] absolute path to <entry path>/<slug>/index.md
  # @param fields [Array<Hash>] schema fields
  # @return [Array(Array<String>, Array<String>)] failures and warnings
  def validate_entry(file, fields)
    failures = []
    warnings = []
    rel = file.delete_prefix("#{root}/")
    folder = File.basename(File.dirname(file))
    entry_dir = File.dirname(file)

    begin
      data, body, front_matter = split_document(file)
    rescue StandardError => e
      return [[e.message], warnings]
    end

    # `summary` is a schema field and is checked by the field loop below; only
    # the two keys the site itself relies on are hardcoded here.
    %w[title slug].each do |key|
      failures << "#{where(rel, front_matter, key)}: `#{key}` is missing or empty" if blank?(data[key])
    end

    # Entry bodies are markdown a submitter wrote. Without this flag Jekyll runs
    # them through Liquid at build time, so a `{% include %}` in a write-up
    # would execute. The scaffolder emits it; hand-written entries should too.
    unless data["render_with_liquid"] == false
      warnings << "#{where(rel, front_matter, 'render_with_liquid')}: add `render_with_liquid: false` so the page body is not run through Liquid"
    end

    if data["slug"].to_s != folder
      failures << "#{where(rel, front_matter, 'slug')}: `slug` is #{data['slug'].inspect} but the folder is #{folder.inspect}"
    end
    unless date?(data["published"])
      failures << "#{where(rel, front_matter, 'published')}: `published` (#{data['published'].inspect}) is not a YYYY-MM-DD date"
    end
    if data.key?("updated") && !blank?(data["updated"]) && !date?(data["updated"])
      failures << "#{where(rel, front_matter, 'updated')}: `updated` (#{data['updated'].inspect}) is not a YYYY-MM-DD date"
    end

    fields.each do |field|
      key = field["key"].to_s
      type = field["type"].to_s
      value = data[key]
      spot = where(rel, front_matter, key)

      if type == "markdown"
        failures << "#{rel}: the page body is empty but `#{key}` (#{field['label']}) is required" if field["required"] && body.strip.empty?
        next
      end

      if field["required"] && blank?(value)
        failures << "#{spot}: `#{key}` (#{field['label']}) is required but missing or empty"
      end

      options = Array(field["options"]).map(&:to_s)

      case type
      when "select"
        unless blank?(value) || options.empty? || options.include?(value.to_s)
          failures << "#{spot}: `#{key}` value #{value.inspect} is not one of the allowed options (#{options.join(', ')})"
        end
      when "multiselect", "list"
        if !value.nil? && !value.is_a?(Array)
          failures << "#{spot}: `#{key}` must be a YAML list"
        elsif type == "multiselect" && value.is_a?(Array) && !options.empty?
          extra = value.map(&:to_s) - options
          failures << "#{spot}: `#{key}` has values outside the allowed options: #{extra.join(', ')}" if extra.any?
        end
      when "images"
        check_images(value, { rel: rel, entry_dir: entry_dir, key: key, where: spot }, failures, warnings) unless value.nil?
      when "links"
        check_links(value, { key: key, where: spot }, failures) unless value.nil?
      when "url"
        unless blank?(value) || http_url?(value)
          failures << "#{spot}: `#{key}` must start with http:// or https:// (got #{value.inspect})"
        end
      when "email"
        unless blank?(value) || value.to_s.include?("@")
          failures << "#{spot}: `#{key}` does not look like an email address (#{value.inspect})"
        end
      end
    end

    [failures, warnings]
  end

  # Structural check for cohort event pages.
  # @param file [String]
  # @return [Array<String>] failures
  def validate_event(file)
    rel = file.delete_prefix("#{root}/")
    begin
      data, = split_document(file)
    rescue StandardError => e
      return [e.message]
    end

    %w[title cohort event_id].filter_map do |key|
      "#{rel}: `#{key}` is missing or empty" if blank?(data[key])
    end
  end

  # Validate every entry and cohort event under `root`.
  # @param root [String] repository root
  # @return [Array(Array<String>, Array<String>)] failures and warnings
  def run(dir = root)
    self.root = dir
    schema_path = File.join(root, "_data", "schema.yml")
    raise "Missing _data/schema.yml; cannot validate entries." unless File.exist?(schema_path)

    schema = load_yaml(File.read(schema_path), "_data/schema.yml")
    fields = Array(schema["fields"])
    entry_path = (schema.dig("entry", "path") || "catalog").to_s

    failures = []
    warnings = []

    Dir.glob(File.join(root, entry_path, "*", "index.md")).sort.each do |file|
      entry_failures, entry_warnings = validate_entry(file, fields)
      failures.concat(entry_failures)
      warnings.concat(entry_warnings)
    end

    Dir.glob(File.join(root, "cohorts", "*", "events", "*", "index.md")).sort.each do |file|
      failures.concat(validate_event(file))
    end

    [failures, warnings]
  end
end

if $PROGRAM_NAME == __FILE__
  begin
    failures, warnings = FrontMatterCheck.run
  rescue StandardError => e
    warn e.message
    exit 1
  end

  warnings.each { |warning| warn "Warning: #{warning}" }

  if failures.any?
    warn "Front matter validation failed:"
    failures.each { |failure| warn "  - #{failure}" }
    exit 1
  end

  puts "Front matter validation passed."
end
