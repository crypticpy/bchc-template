#!/usr/bin/env ruby
# frozen_string_literal: true

# Rewrite the `events` list in _data/cohorts/<year>.yml from the YAML block a
# maintainer pasted into the "Update cohort schedule" issue form.
#
# Env: ISSUE_BODY, ISSUE_NUMBER (optional)

require "yaml"
require "psych"
require "date"
require "time"

issue_body = ENV["ISSUE_BODY"].to_s.gsub("\r\n", "\n")
issue_number = ENV["ISSUE_NUMBER"].to_s.strip

if issue_body.strip.empty?
  warn "Issue body is empty; cannot update the schedule."
  exit 1
end

# "Schedule entries (YAML)" -> "schedule_entries"
def normalize_key(key)
  key.to_s.sub(/\s*\([^)]*\)\s*\z/, "").strip.downcase.gsub(/[^a-z0-9]+/, "_").gsub(/\A_+|_+\z/, "")
end

# GitHub wraps a `render: yaml` textarea in a fenced code block.
def strip_code_fence(text)
  text.to_s.strip.sub(/\A```[a-zA-Z]*[ \t]*\n/, "").sub(/\n?```\z/, "")
end

def slugify(value)
  value.to_s.strip.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-+|-+\z/, "")
end

values = {}
issue_body.split(/^###\s+/).drop(1).each do |section|
  heading_line, *rest = section.lines
  next unless heading_line

  values[normalize_key(heading_line)] = rest.join.strip
end

cohort_year = values["cohort_year"].to_s.strip
schedule_yaml = strip_code_fence(values["schedule_entries"])

unless cohort_year.match?(/\A\d{4}\z/)
  warn "The cohort year is required and must be a four-digit year."
  exit 1
end

if schedule_yaml.empty?
  warn "No schedule entries were provided."
  exit 1
end

begin
  parsed_events = YAML.safe_load(schedule_yaml, permitted_classes: [Date], permitted_symbols: [], aliases: false)
rescue Psych::SyntaxError => e
  warn "The schedule YAML could not be parsed: #{e.message}"
  exit 1
end

unless parsed_events.is_a?(Array)
  warn "Schedule entries must be a YAML list of events."
  exit 1
end

processed_events = []
used_ids = {}

parsed_events.each_with_index do |event, index|
  unless event.is_a?(Hash)
    warn "The event at position #{index + 1} is not a YAML mapping."
    exit 1
  end

  name = event["name"].to_s.strip
  date_value = event["date"].to_s.strip

  if name.empty? || date_value.empty?
    warn "Every event needs a name and a date (position #{index + 1})."
    exit 1
  end

  begin
    date_iso = Date.iso8601(date_value).to_s
  rescue Date::Error
    warn "Event '#{name}' has an invalid date #{date_value.inspect}; expected YYYY-MM-DD."
    exit 1
  end

  event_id = event["id"].to_s.strip
  event_id = slugify(name) if event_id.empty?

  base_id = event_id.dup
  counter = 1
  while used_ids[event_id]
    counter += 1
    event_id = "#{base_id}-#{counter}"
  end
  used_ids[event_id] = true

  normalized = { "id" => event_id, "name" => name, "date" => date_iso }

  %w[time location description type state icon].each do |optional_key|
    value = event[optional_key]
    next if value.nil? || value.to_s.strip.empty?

    normalized[optional_key] = value.to_s.strip
  end

  processed_events << normalized
end

data_path = File.expand_path("../_data/cohorts/#{cohort_year}.yml", __dir__)

unless File.exist?(data_path)
  warn "No data file for cohort #{cohort_year} (_data/cohorts/#{cohort_year}.yml). Scaffold the year first."
  exit 1
end

original_content = File.read(data_path)
data = YAML.safe_load(original_content, permitted_classes: [Date], permitted_symbols: [], aliases: false) || {}
data["events"] = processed_events

new_content = Psych.dump(data, line_width: -1)

def write_output(pairs)
  output = ENV["GITHUB_OUTPUT"]
  return unless output

  File.open(output, "a") { |f| pairs.each { |line| f.puts(line) } }
end

if new_content == original_content
  puts "No schedule changes detected for cohort #{cohort_year}."
  write_output(["changed=false"])
  exit 0
end

File.write(data_path, new_content)

summary_lines = processed_events.map { |event| "- #{event['name']} (#{event['date']})" }
branch = "schedule/#{cohort_year}-#{Time.now.utc.strftime('%Y%m%d%H%M%S')}"

write_output([
  "changed=true",
  "branch=#{branch}",
  "year=#{cohort_year}",
  "summary<<SUMMARY",
  summary_lines.join("\n"),
  "SUMMARY"
])

puts "Updated the schedule for cohort #{cohort_year}#{issue_number.empty? ? '' : " (issue ##{issue_number})"}."
