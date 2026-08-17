---
layout: entry
title: "Multilingual environmental complaint intake"
slug: 311-multilingual-intake
summary: "Translates and classifies resident complaints about rodents, mold, noise and air quality from the 311 feed and web forms into inspector work orders."
published: 2026-05-02
updated: 2026-06-22
featured: true
sample: true
impact: "Median time from complaint to routed work order fell from two days to four minutes"
organization: "Riverbend County Public Health"
solution_type: "Cloud deployment"
area:
  - "Environmental health"
  - "Communications & outreach"
  - "IT & operations"
stage: "In production"
ai_role: "AI is part of the solution"
ai_types:
  - "Translation"
  - "Classification & NLP"
ai_tools:
  - "Amazon Bedrock"
  - "Amazon Translate"
  - "AWS Lambda"
  - "Terraform"
platform:
  - "AWS"
expertise: "Contractor or vendor"
readiness:
  - "Needs customization"
  - "Needs a contractor"
  - "Human review built in"
docs_url: "https://docs.example.gov/riverbend/eh-intake-architecture"
resources:
  - label: "Architecture and IAM boundary diagram (PDF)"
    url: "https://docs.example.gov/riverbend/eh-intake-architecture.pdf"
  - label: "Shadow-period agreement study"
    url: "https://drive.example.org/file/d/9f8e7d6c/view"
  - label: "Terraform module (container registry)"
    url: "https://registry.example.com/riverbend/eh-intake"
screenshots:
  - src: /catalog/311-multilingual-intake/screenshots/01.png
    alt: "Inspector queue showing translated complaints with the original language, assigned category, urgency tier and routing status."
data_sensitivity:
  - "Personal information (PII)"
  - "Internal, non-public data"
data_sources:
  - "311 complaint API"
  - "Web complaint form"
  - "Inspections database"
audience: "Public-facing"
contact_name: "Marcus Ellison"
contact_email: "marcus.ellison@example.org"
---

## Problem

Complaints reach us in more than 20 languages. Before this project, a non-English submission sat in a queue until a bilingual staff member could read it, and the category it eventually received depended on which district office read it. Two people could file the same complaint about the same building and end up with different categories and different urgency.

## What we built

A small AWS deployment that sits between the intake channels and the inspections database. A complaint arrives through the 311 API or the web form. It is translated to English while the original wording is kept on the record. A model then assigns one of eleven categories and an urgency tier using a fixed written rubric, and the result is written to the existing inspections database as a work order.

Tier 1 — the urgency level that pulls an inspector out the same day — is always confirmed by a person before the work order is released. Tiers 2 and 3 route automatically.

## How it works

Everything is defined in Terraform: API Gateway, two Lambda functions, the translation and model calls, and the queue that writes to the inspections database. Raw complaint text is retained for 30 days and then deleted; the categorised work order is retained under the normal records schedule.

There is no public repository — the code is entangled with our inspections schema — but the architecture document walks through the IAM boundaries, the retention policy and the rubric, which is the part worth copying.

## Results

Median time from complaint to routed work order dropped from about two days to four minutes. Category agreement between the model and staff, measured during a two-month shadow period, was 91%. The categories that disagreed most often — mold versus general housing — were merged, because the disagreement turned out to be a definition problem, not a model problem.

Residents also see faster acknowledgements, and complaints in less common languages no longer wait longer than complaints in English.

## Lessons learned

Run a shadow period. Ours was two months of the model categorising alongside staff with no effect on routing, and it changed the category list before anyone depended on it. Keeping the original text visible next to the translation matters too — inspectors check it more often than we expected, and it is the only way to catch a translation that dropped a detail.

## How to reuse

The architecture is generic; the rubric is not. Expect to write your own category definitions with the people who will act on them, then run a shadow period against real complaints. A contractor stood ours up in about six weeks, most of which was integration with the inspections database rather than the AI parts.
