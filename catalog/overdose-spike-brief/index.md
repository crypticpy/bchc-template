---
layout: entry
render_with_liquid: false
title: "Overdose spike situational brief generator"
slug: overdose-spike-brief
summary: "Assembles naloxone runs, emergency department visits and medical examiner reports into a one-page situational brief within an hour of a spike alert."
published: 2026-03-09
featured: true
sample: true
impact: "Cut brief turnaround from three days to under one hour"
organization: "Harbor City Health Department"
solution_type: "Source code"
area:
  - "Epidemiology & surveillance"
  - "Clinical & community services"
stage: "Pilot"
ai_role: "Both"
ai_types:
  - "Generative text (LLM)"
ai_tools:
  - "OpenAI API"
  - "Streamlit"
  - "Python"
  - "GitHub Copilot"
platform:
  - "On-premises"
  - "Desktop or local"
expertise: "Analyst or data scientist"
readiness:
  - "Needs customization"
  - "Needs a data agreement"
  - "Human review built in"
repo_url: "https://github.com/example-org/spike-brief"
demo_url: "https://example-org.github.io/spike-brief-demo/"
resources:
  - label: "Synthetic sample dataset"
    url: "https://drive.example.org/drive/folders/spike-brief-sample"
  - label: "Walkthrough video (8 minutes)"
    url: "https://videos.example.org/share/spike-brief-walkthrough"
screenshots:
  - src: /catalog/overdose-spike-brief/screenshots/01.png
    alt: "Draft situational brief showing four summary tiles, a bar chart of naloxone runs by neighbourhood, and the drafted narrative."
  - src: /catalog/overdose-spike-brief/screenshots/02.png
    alt: "Brief generator form with an alert window, a neighbourhood checklist and a generate button."
data_sensitivity:
  - "Health information (PHI)"
  - "De-identified data"
  - "Criminal justice data (CJIS)"
data_sources:
  - "EMS naloxone administrations"
  - "Emergency department chief complaints"
  - "Medical examiner preliminary reports"
  - "Law enforcement naloxone reports"
audience: "Internal staff"
contact_name: "Renee Okafor"
contact_email: "renee.okafor@example.org"
---

## Problem

When the substance use division declares a spike, leadership wants a brief the same day. Assembling one meant three people pulling from three systems, agreeing on a time window, rebuilding the same charts, and writing the narrative by hand. In practice the brief arrived two or three days after the alert, by which point the question had usually moved on.

## What we built

A small Streamlit app that an analyst runs on a workstation inside our network. The analyst picks an alert window and the neighbourhoods to include. The app pulls each feed, computes deltas against an eight-week baseline, renders the charts, and drafts the narrative paragraphs. The analyst edits the draft and exports a one-page PDF.

## How it works

Every feed is queried at record level inside our environment. The model only ever receives the aggregate table that ends up in the brief — counts by day, by neighbourhood, and the baseline comparison. No record-level data, no names, no addresses leave the network boundary.

The law enforcement naloxone feed comes from a system covered by criminal justice data rules, so it arrives through a standing data-sharing agreement and is aggregated before it reaches the app at all. That agreement was the longest part of the project by a wide margin.

We also used an AI coding assistant while building the app, mostly for the chart code and the PDF export. That is why this entry is tagged as both AI in the product and AI used to build it.

## Results

The first brief produced under the new process was ready 52 minutes after the alert. Across the pilot, median turnaround was under an hour against a previous median of three days. Analyst editing is still substantial — roughly a quarter of the drafted narrative gets rewritten — but starting from a draft with the numbers already correct is what saves the time.

## Lessons learned

Keeping the model on the aggregate side of the boundary made every governance conversation shorter. Reviewers stopped asking about the model and started asking about the data agreement, which was the right question.

## How to reuse

The repository ships with a synthetic sample dataset so you can run the whole flow end to end before you connect anything real. Swap the three loader functions for your own sources and adjust the baseline window. Expect the data agreement, not the code, to set your timeline.
