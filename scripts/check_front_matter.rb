#!/usr/bin/env ruby
# frozen_string_literal: true

# Validates catalog entry front matter against _data/schema.yml, plus a light
# structural check of cohort event pages. Ruby stdlib only so it can run on a
# bare `ruby/setup-ruby` runner without `bundle install`.

require "yaml"
require "date"

ROOT = File.expand_path("..", __dir__)
SCHEMA_PATH = File.join(ROOT, "_data", "schema.yml")

def load_yaml(text, source)
  YAML.safe_load(text, permitted_classes: [Date, Time], permitted_symbols: [], aliases: false) || {}
rescue Psych::SyntaxError => e
  raise "#{source} has invalid YAML: #{e.message}"
end

unless File.exist?(SCHEMA_PATH)
  warn "Missing _data/schema.yml; cannot validate entries."
  exit 1
end

schema = load_yaml(File.read(SCHEMA_PATH), "_data/schema.yml")
fields = Array(schema["fields"])
entry_path = (schema.dig("entry", "path") || "catalog").to_s

failures = []

# Split "---\nfront matter\n---\nbody" into [hash, body]. Raises on a bad header.
def split_document(path)
  content = File.read(path)
  match = content.match(/\A---\s*\n(.*?)\n---\s*(?:\n(.*))?\z/m)
  raise "#{path} is missing YAML front matter" unless match

  [load_yaml(match[1], path), (match[2] || "")]
end

def blank?(value)
  return true if value.nil?
  return value.empty? if value.is_a?(Array)

  value.to_s.strip.empty?
end

def date?(value)
  return true if value.is_a?(Date) || value.is_a?(Time)

  Date.iso8601(value.to_s)
  true
rescue ArgumentError, Date::Error, TypeError
  false
end

Dir.glob(File.join(ROOT, entry_path, "*", "index.md")).sort.each do |file|
  rel = file.delete_prefix("#{ROOT}/")
  folder = File.basename(File.dirname(file))

  begin
    data, body = split_document(file)
  rescue StandardError => e
    failures << e.message
    next
  end

  %w[title slug summary].each do |key|
    failures << "#{rel}: `#{key}` is missing or empty" if blank?(data[key])
  end

  failures << "#{rel}: `slug` is #{data['slug'].inspect} but the folder is #{folder.inspect}" if data["slug"].to_s != folder
  failures << "#{rel}: `published` (#{data['published'].inspect}) is not a YYYY-MM-DD date" unless date?(data["published"])

  fields.each do |field|
    key = field["key"].to_s
    type = field["type"].to_s
    value = data[key]

    if type == "markdown"
      failures << "#{rel}: the page body is empty but `#{key}` is required" if field["required"] && body.strip.empty?
      next
    end

    if field["required"] && blank?(value)
      failures << "#{rel}: `#{key}` (#{field['label']}) is required but missing or empty"
    end

    options = Array(field["options"]).map(&:to_s)

    case type
    when "select"
      unless blank?(value) || options.empty? || options.include?(value.to_s)
        failures << "#{rel}: `#{key}` value #{value.inspect} is not one of the allowed options"
      end
    when "multiselect", "list"
      if !value.nil? && !value.is_a?(Array)
        failures << "#{rel}: `#{key}` must be a YAML list"
      elsif type == "multiselect" && value.is_a?(Array) && !options.empty?
        extra = value.map(&:to_s) - options
        failures << "#{rel}: `#{key}` has values outside the allowed options: #{extra.join(', ')}" if extra.any?
      end
    when "url"
      unless blank?(value) || value.to_s.match?(%r{\Ahttps?://})
        failures << "#{rel}: `#{key}` must start with http:// or https:// (got #{value.inspect})"
      end
    when "email"
      failures << "#{rel}: `#{key}` does not look like an email address (#{value.inspect})" unless blank?(value) || value.to_s.include?("@")
    end
  end
end

Dir.glob(File.join(ROOT, "cohorts", "*", "events", "*", "index.md")).sort.each do |file|
  rel = file.delete_prefix("#{ROOT}/")

  begin
    data, = split_document(file)
  rescue StandardError => e
    failures << e.message
    next
  end

  %w[title cohort event_id].each do |key|
    failures << "#{rel}: `#{key}` is missing or empty" if blank?(data[key])
  end
end

if failures.any?
  warn "Front matter validation failed:"
  failures.each { |failure| warn "  - #{failure}" }
  exit 1
end

puts "Front matter validation passed."
