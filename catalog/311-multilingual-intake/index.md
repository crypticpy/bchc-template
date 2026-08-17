---
title: "Multilingual Environmental Complaint Intake"
slug: 311-multilingual-intake
summary: "Cloud-hosted service that translates and classifies resident complaints (rodents, mold, noise, air quality) from 311 and web forms into inspector work orders."
published: 2026-05-02
featured: true
sample: true
organization: "Los Angeles County Department of Public Health"
solution_type: "Cloud deployment (AWS, Azure, GCP)"
domain:
  - "Environmental health"
  - "Communications & outreach"
ai_tools:
  - "Amazon Bedrock"
  - "AWS Lambda"
  - "Amazon Translate"
stage: "In production"
repo_url: ""
demo_url: ""
docs_url: "https://example.org/eh-intake-architecture"
vendor: ""
data_sources:
  - "311 API"
  - "Web complaint form"
contact_name: "Marcus Ellison"
contact_email: "mellison@example.org"
deck_pdf: ""
---
## Overview

Complaints arrive in more than 20 languages. Before this, non-English submissions waited for a bilingual staff member and were classified inconsistently across district offices.

## Architecture

- API Gateway → Lambda receives the complaint payload.
- Amazon Translate normalises to English (original text is retained).
- A Bedrock model assigns one of 11 complaint categories and an urgency tier using a fixed rubric.
- Output is written to the existing inspections database; humans confirm urgency for tier 1.

Infrastructure is defined in Terraform. There is no public repository, but the architecture document above walks through IAM boundaries and the data retention policy (30 days for raw text).

## Governance notes

We ran a two-month shadow period comparing model categories to staff categories (agreement 91%). Categories with lower agreement (mold vs. general housing) were merged.
