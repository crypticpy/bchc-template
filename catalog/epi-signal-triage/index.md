---
title: "Syndromic Surveillance Signal Triage Assistant"
slug: epi-signal-triage
summary: "An LLM-assisted workflow that reads daily ESSENCE alerts, drafts a plain-language triage note for each signal, and flags the ones an epidemiologist should look at first."
published: 2026-06-18
featured: true
sample: true
cohort: "2026"
organization: "Chicago Department of Public Health"
solution_type: "Source code (GitHub or similar)"
domain:
  - "Epidemiology & surveillance"
  - "Data, analytics & informatics"
ai_tools:
  - "Claude"
  - "Python"
  - "LangChain"
stage: "Pilot"
repo_url: "https://github.com/example-cdph/signal-triage"
demo_url: ""
docs_url: "https://github.com/example-cdph/signal-triage/wiki"
vendor: ""
data_sources:
  - "ESSENCE syndromic feed"
  - "Internal case counts"
contact_name: "Priya Natarajan"
contact_email: "priya.natarajan@example.org"
deck_pdf: "/catalog/epi-signal-triage/deck.pdf"
---
## Problem

Every morning our surveillance team receives 40–80 automated alerts from ESSENCE. Most are noise; a handful matter. Reviewing all of them by hand took two analysts about 90 minutes a day.

## What we built

A scheduled Python job pulls the alert export, enriches each signal with 14 days of history and the relevant syndrome definition, and asks the model to:

- summarise what changed in one sentence,
- rate confidence that the signal is a true increase (with reasoning),
- suggest the single most useful follow-up query.

Results land in a Teams channel as a ranked list. Nothing is auto-closed; the analyst still makes every call.

## Results so far

- Review time down from ~90 to ~30 minutes/day.
- Two clusters were caught earlier than they would have been under manual review.
- Model "confidence" is treated as a sorting hint only — we publish the evaluation notebook in the repo.

## What we'd tell another city

Start with the data you already export. The prompt is 60 lines; the hard part was the alert enrichment. Happy to share the syndrome mapping tables on request.
