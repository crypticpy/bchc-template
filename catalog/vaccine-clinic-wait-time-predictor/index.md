---
layout: entry
title: Vaccine clinic wait-time predictor
slug: vaccine-clinic-wait-time-predictor
published: "2026-08-17"
featured: false
thumbnail: ""
summary: Predicts hourly wait times at walk-in vaccine clinics from appointment counts and staffing so the front desk can post honest estimates.
impact: Posted estimates were within 10 minutes of actual waits 82% of the time
organization: Example County Health Department
solution_type: Source code
area:
  - Clinical & community services
  - Communications & outreach
stage: Pilot
ai_role: AI is part of the solution
ai_types:
  - Prediction & forecasting
ai_tools:
  - scikit-learn
  - Python
platform:
  - On-premises
vendor: ""
expertise: Analyst or data scientist
readiness:
  - Needs customization
  - Human review built in
repo_url: https://github.com/example-org/clinic-wait-predictor
demo_url: ""
docs_url: ""
resources:
  - label: Model card
    url: https://docs.example.org/clinic-wait/model-card.pdf
  - label: example.org
    url: https://example.org/clinic-wait/slides
screenshots:
  - src: /catalog/vaccine-clinic-wait-time-predictor/screenshots/01.png
    alt: Ranked queue of clinic sessions with predicted wait
  - src: https://example.org/does-not-exist.png
    alt: Broken link on purpose
deck_pdf: /catalog/vaccine-clinic-wait-time-predictor/deck.pdf
data_sensitivity:
  - Internal, non-public data
data_sources:
  - Appointment system exports
  - Staffing roster
audience: Public-facing
contact_name: Test Contact
contact_email: test@example.org
---

## Problem

Walk-in clinics posted "about 30 minutes" regardless of reality.

## What we built

A small gradient-boosted model retrained nightly.
