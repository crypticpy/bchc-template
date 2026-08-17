#!/usr/bin/env ruby
# frozen_string_literal: true

# GitHub rejects pushes containing files over 100 MB and Pages artifacts get
# unwieldy long before that. Fail hard at 50 MB, nudge at 10 MB.

require "find"

MEGABYTE = 1024 * 1024
FAIL_BYTES = 50 * MEGABYTE
WARN_BYTES = 10 * MEGABYTE
SKIP_DIRS = %w[.git node_modules vendor _site].freeze

root = File.expand_path("..", __dir__)
failures = []
warnings = []

Find.find(root) do |path|
  if File.directory?(path)
    Find.prune if SKIP_DIRS.include?(File.basename(path))
    next
  end

  next if File.symlink?(path)

  size = File.size(path)
  rel = path.delete_prefix("#{root}/")
  megabytes = format("%.1f MB", size / MEGABYTE.to_f)

  if size > FAIL_BYTES
    failures << "#{rel} is #{megabytes} (limit 50 MB)"
  elsif size > WARN_BYTES
    warnings << "#{rel} is #{megabytes}"
  end
end

warnings.each { |warning| warn "Warning: large file — #{warning}" }

if failures.any?
  warn "File size check failed:"
  failures.each { |failure| warn "  - #{failure}" }
  exit 1
end

puts "File size check passed."
