#!/usr/bin/env ruby
# frozen_string_literal: true

# Read-only companion to update_schedule_from_issue.rb: shows the maintainer
# which event IDs their YAML block will produce before anything is written.
#
# Env: ISSUE_BODY. Outputs: year, preview_ids.

require "yaml"
require "date"
require "securerandom"

issue_body = ENV["ISSUE_BODY"].to_s.gsub("\r\n", "\n")

def slugify(value)
  value.to_s.strip.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-+|-+\z/, "")
end

# "Schedule entries (YAML)" -> "schedule_entries"
def normalize_key(key)
  key.to_s.sub(/\s*\([^)]*\)\s*\z/, "").strip.downcase.gsub(/[^a-z0-9]+/, "_").gsub(/\A_+|_+\z/, "")
end

# GitHub wraps a `render: yaml` textarea in a fenced code block.
def strip_code_fence(text)
  text.to_s.strip.sub(/\A```[a-zA-Z]*[ \t]*\n/, "").sub(/\n?```\z/, "")
end

values = {}
issue_body.split(/^###\s+/).drop(1).each do |section|
  heading, *rest = section.split("\n")
  key = normalize_key(heading)
  values[key] = rest.join("\n").strip
end

year = values["cohort_year"].to_s.strip

parsed = begin
  YAML.safe_load(strip_code_fence(values["schedule_entries"]), permitted_classes: [Date], permitted_symbols: [], aliases: false) || []
rescue StandardError
  []
end

used_ids = {}
events = Array(parsed).select { |e| e.is_a?(Hash) }.map do |event|
  name = event["name"].to_s
  id = event["id"].to_s.strip
  id = slugify(name) if id.empty?

  # Mirrors the de-duplication in update_schedule_from_issue.rb.
  base_id = id.dup
  counter = 1
  while used_ids[id]
    counter += 1
    id = "#{base_id}-#{counter}"
  end
  used_ids[id] = true

  { "id" => id, "name" => name, "date" => event["date"] }
end

md = if events.empty?
       "No events could be read from the YAML block."
     else
       events.map { |e| "- `#{e['id']}` — #{e['name']}#{e['date'] ? " (#{e['date']})" : ''}" }.join("\n")
     end

if (output = ENV["GITHUB_OUTPUT"])
  # `md` is built from issue text, so a fixed heredoc delimiter would let a
  # submitter close the block early and inject their own step outputs. A random
  # delimiter per write cannot be guessed from the issue.
  delimiter = "GHEOF_preview_ids_#{SecureRandom.hex(8)}"
  File.open(output, "a") do |f|
    f.puts("year=#{year.gsub(/[^0-9]/, '')}")
    f.puts("preview_ids<<#{delimiter}")
    f.puts(md)
    f.puts(delimiter)
  end
end

puts "Previewed normalized event IDs."
