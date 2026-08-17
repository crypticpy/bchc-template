---
title: "Plain-Language Restaurant Inspection Summaries"
slug: restaurant-inspection-summaries
summary: "Batch job that rewrites inspector code citations into short resident-friendly summaries for the public inspection lookup site."
published: 2026-02-20
featured: false
sample: true
organization: "Public Health – Seattle & King County"
solution_type: "Source code (GitHub or similar)"
domain:
  - "Environmental health"
  - "Communications & outreach"
ai_tools:
  - "Google Vertex AI"
  - "Gemini"
  - "BigQuery"
stage: "Idea / exploring"
repo_url: "https://github.com/example-kc/inspection-summaries"
demo_url: ""
docs_url: ""
vendor: ""
data_sources:
  - "Food inspection results"
contact_name: "Tomás Herrera"
contact_email: "therrera@example.org"
deck_pdf: ""
---
## Goal

Inspection results are public but written for inspectors ("Red 5 – Improper hot holding"). We wanted a two-sentence summary a resident can understand, without editorialising about whether a place is "safe."

## Approach

A nightly BigQuery scheduled query selects new inspections; a Cloud Run job calls Gemini with a tightly-scoped prompt and a set of style rules (no adjectives, name the corrected items, one sentence on follow-up). Output is reviewed in a weekly sample by the food program lead.

## Open questions

We are still exploring how to present the summaries so residents don't read them as a rating. Feedback from other jurisdictions that publish inspection data is welcome.
