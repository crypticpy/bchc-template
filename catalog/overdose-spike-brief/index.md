---
title: "Overdose Spike Situational Brief Generator"
slug: overdose-spike-brief
summary: "Notebook and Streamlit app that assembles EMS naloxone runs, ED visits and medical examiner data into a one-page brief within an hour of a spike alert."
published: 2026-03-09
featured: true
sample: true
cohort: "2026"
organization: "Philadelphia Department of Public Health"
solution_type: "Source code (GitHub or similar)"
domain:
  - "Epidemiology & surveillance"
  - "Clinical & community services"
ai_tools:
  - "OpenAI API"
  - "Streamlit"
  - "Python"
stage: "Pilot"
repo_url: "https://github.com/example-phila/spike-brief"
demo_url: "https://example-phila.github.io/spike-brief-demo/"
docs_url: ""
vendor: ""
data_sources:
  - "EMS naloxone administrations"
  - "ED chief complaint feed"
  - "MEO preliminary reports"
contact_name: "Renee Okafor"
contact_email: "rokafor@example.org"
deck_pdf: ""
---
## Context

When the substance use division declares a spike, leadership wants a brief the same day. Assembling it manually meant three people pulling from three systems.

## How it works

1. An analyst runs the app and picks the alert window and neighbourhoods.
2. The app pulls the three feeds, produces charts with Plotly, and computes deltas against baseline.
3. The model writes the narrative paragraphs from a structured summary — it never sees row-level data.
4. The analyst edits and exports to PDF.

## Sharing

The repository includes synthetic sample data so you can run it end to end. Swap the three loader functions for your own sources.
