# frozen_string_literal: true

# Unit tests for scripts/check_front_matter.rb.
#
#   npm run test:ruby     (or: ruby -Itest test/scripts/check_front_matter_test.rb)
#
# Fixtures are written into a temporary directory rather than committed, so
# Jekyll never sees stray pages with `layout: entry` front matter.

require "minitest/autorun"
require "tmpdir"
require "fileutils"

require_relative "../../scripts/check_front_matter"

class CheckFrontMatterTest < Minitest::Test
  SCHEMA = <<~YAML
    entry:
      path: catalog
    fields:
      - key: title
        label: Title
        type: text
        required: true
      - key: summary
        label: Summary
        type: textarea
        required: true
      - key: stage
        label: Stage
        type: select
        options:
          - Pilot
          - In production
      - key: area
        label: Area
        type: multiselect
        options:
          - Data
          - Policy
      - key: repo_url
        label: Repo
        type: url
      - key: contact_email
        label: Email
        type: email
      - key: screenshots
        label: Screenshots
        type: images
      - key: resources
        label: Resources
        type: links
      - key: body
        label: Write-up
        type: markdown
        required: true
  YAML

  # 1x1 transparent PNG, so an `images` src can point at a file that exists.
  PNG = ["89504e470d0a1a0a0000000d494844520000000100000001080600000" \
         "01f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082"].pack("H*")

  def setup
    @root = Dir.mktmpdir("front-matter-test")
    FileUtils.mkdir_p(File.join(@root, "_data"))
    File.write(File.join(@root, "_data", "schema.yml"), SCHEMA)
  end

  def teardown
    FileUtils.remove_entry(@root)
    FrontMatterCheck.root = FrontMatterCheck::DEFAULT_ROOT
  end

  # Write catalog/<slug>/index.md with the given front matter and body.
  def write_entry(slug, front_matter, body = "Some write-up.")
    dir = File.join(@root, "catalog", slug)
    FileUtils.mkdir_p(dir)
    File.write(File.join(dir, "index.md"), "---\n#{front_matter.strip}\n---\n\n#{body}\n")
    dir
  end

  def run_check
    FrontMatterCheck.run(@root)
  end

  def test_a_complete_entry_passes
    dir = write_entry("good", <<~FM)
      title: A good entry
      slug: good
      summary: It does a thing.
      published: "2026-01-05"
      updated: "2026-02-01"
      stage: Pilot
      area:
        - Data
      repo_url: https://example.org/repo
      contact_email: a@example.org
      screenshots:
        - src: screenshots/01.png
          alt: The queue view
      resources:
        - label: Report
          url: https://example.org/r.pdf
    FM
    FileUtils.mkdir_p(File.join(dir, "screenshots"))
    File.binwrite(File.join(dir, "screenshots", "01.png"), PNG)

    failures, warnings = run_check
    assert_empty failures
    assert_empty warnings
  end

  def test_slug_must_match_the_folder_and_dates_must_be_iso
    write_entry("mismatch", <<~FM)
      title: T
      slug: something-else
      summary: S
      published: January 2026
      updated: not-a-date
      body: x
    FM

    failures, = run_check
    assert(failures.any? { |f| f.include?("`slug` is \"something-else\" but the folder is \"mismatch\"") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`published`") && f.include?("YYYY-MM-DD") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`updated`") && f.include?("YYYY-MM-DD") }, failures.inspect)
  end

  def test_required_fields_and_option_membership
    write_entry("bad-options", <<~FM, "")
      title: T
      slug: bad-options
      summary: ""
      published: "2026-01-05"
      stage: Prototype
      area:
        - Data
        - Nonsense
    FM

    failures, = run_check
    assert(failures.any? { |f| f.include?("`summary` is missing or empty") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`stage` value \"Prototype\" is not one of the allowed options") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`area` has values outside the allowed options: Nonsense") }, failures.inspect)
    assert(failures.any? { |f| f.include?("the page body is empty") }, failures.inspect)
  end

  def test_failures_carry_a_line_number
    write_entry("lines", <<~FM)
      title: T
      slug: lines
      summary: S
      published: "2026-01-05"
      stage: Nope
    FM

    failures, = run_check
    stage_failure = failures.find { |f| f.include?("`stage` value") }
    assert_equal "catalog/lines/index.md:6", stage_failure.split(": ").first
  end

  def test_images_must_exist_and_alt_text_is_only_a_warning
    write_entry("images", <<~FM)
      title: T
      slug: images
      summary: S
      published: "2026-01-05"
      screenshots:
        - src: screenshots/missing.png
          alt: Gone
        - src: https://example.org/remote.png
        - 12
    FM

    failures, warnings = run_check
    assert(failures.any? { |f| f.include?("screenshots/missing.png, which does not exist") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`screenshots[2]` must be a string or a `{src, alt}` mapping") }, failures.inspect)
    assert(warnings.any? { |w| w.include?("points at a remote host") }, warnings.inspect)
    assert(warnings.any? { |w| w.include?("`screenshots[1]` has no `alt` text") }, warnings.inspect)
  end

  def test_images_must_be_a_list
    write_entry("images-scalar", <<~FM)
      title: T
      slug: images-scalar
      summary: S
      published: "2026-01-05"
      screenshots: screenshots/01.png
    FM

    failures, = run_check
    assert(failures.any? { |f| f.include?("`screenshots` must be a YAML list of images") }, failures.inspect)
  end

  def test_links_need_a_label_and_an_http_or_mailto_url
    write_entry("links", <<~FM)
      title: T
      slug: links
      summary: S
      published: "2026-01-05"
      resources:
        - label: ""
          url: ftp://example.org/x
        - label: Mail us
          url: "mailto:a@example.org"
        - just a string
    FM

    failures, = run_check
    assert(failures.any? { |f| f.include?("`resources[0]` has no `label`") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`resources[0]` must be an http(s) or mailto: URL") }, failures.inspect)
    assert(failures.none? { |f| f.include?("`resources[1]`") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`resources[2]` is not a URL") }, failures.inspect)
  end

  def test_url_and_email_shapes
    write_entry("shapes", <<~FM)
      title: T
      slug: shapes
      summary: S
      published: "2026-01-05"
      repo_url: example.org/repo
      contact_email: nobody
    FM

    failures, = run_check
    assert(failures.any? { |f| f.include?("`repo_url` must start with http://") }, failures.inspect)
    assert(failures.any? { |f| f.include?("`contact_email` does not look like an email address") }, failures.inspect)
  end

  def test_a_broken_front_matter_header_is_reported_once
    dir = File.join(@root, "catalog", "broken")
    FileUtils.mkdir_p(dir)
    File.write(File.join(dir, "index.md"), "no front matter here\n")

    failures, = run_check
    assert_equal 1, failures.length
    assert_includes failures.first, "is missing YAML front matter"
  end
end
