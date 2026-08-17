---
title: "Grant Narrative Copilot"
slug: grant-narrative-copilot
summary: "A vendor-hosted writing assistant configured with our program library, used by staff to draft first-pass narratives for federal notices of funding opportunity."
published: 2026-04-14
featured: false
sample: true
organization: "Houston Health Department"
solution_type: "Vendor product or partnership"
domain:
  - "Operations & administration"
  - "Policy & planning"
ai_tools:
  - "Microsoft Copilot"
  - "SharePoint"
stage: "In production"
repo_url: ""
demo_url: ""
docs_url: ""
vendor: "Microsoft"
data_sources:
  - "Program descriptions library"
  - "Prior grant applications (redacted)"
contact_name: "Dana Whitfield"
contact_email: "dwhitfield@example.org"
deck_pdf: ""
---
## Why we're sharing this

There is no code here — this is a configuration and process story, and we think that's most of what other departments need.

## Setup

We assembled a SharePoint library of ~120 approved program descriptions, evaluation summaries and boilerplate (org history, population data), then pointed Copilot at that library only. Staff paste the NOFO section headings and get a first draft grounded in our own language.

## What worked

- Cut first-draft time roughly in half for routine sections.
- Consistency of organisational boilerplate improved noticeably.

## What didn't

- The assistant is enthusiastic about numbers it hasn't seen. Every statistic is verified against the source before submission — we added a checklist step.
- Novel program designs still start from a blank page; the tool helps most with the 60% that is standard.
