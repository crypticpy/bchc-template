---
layout: entry
render_with_liquid: false
title: "Work order classification for fleet and facilities"
slug: fleet-work-order-triage
summary: "A prototype that reads free-text maintenance tickets, assigns a trade and a failure code, and shows the resulting backlog by shop — built to test whether coded tickets would make the backlog legible."
published: 2026-08-05
featured: false
sample: true
impact: "Not in service yet: on 12 months of past tickets it agreed with the shops' own coding 84% of the time"
organization: "County government — Public works, fleet & facilities"
review_status: "Not yet reviewed"
solution_type: "Dashboard or report"
use_case_category: "Operations & logistics"
area:
  - "IT & operations"
  - "Data & informatics"
stage: "Idea / exploring"
ai_role: "AI is part of the solution"
ai_types:
  - "Classification & NLP"
  - "Prediction & forecasting"
ai_tools:
  - "Power Automate"
  - "Power BI"
  - "Azure OpenAI Service"
platform:
  - "Low-code platform"
  - "Microsoft Azure"
expertise: "Power user"
readiness:
  - "Reference only"
  - "Needs customization"
docs_url: "https://docs.example.gov/work-order-triage/prototype-notes"
resources:
  - label: "Failure code list and trade mapping (spreadsheet)"
    url: "https://docs.example.org/spreadsheets/d/2w9e4r6t/edit"
  - label: "Bench test results (shared doc)"
    url: "https://docs.example.org/document/d/7y1u5i3o/edit"
screenshots:
  - src: /catalog/fleet-work-order-triage/screenshots/01.png
    alt: "Prototype backlog view grouping maintenance tickets by shop and trade, with proposed failure codes and an agreement rate against the shops' own coding."
license: "Not open source — available on request"
access_terms: "A prototype in a low-code environment, so there is no package to hand over. The failure code list and the bench test write-up are linked above and free to reuse; ask us for the flow definition if you want it."
portability: "Partially — with rework"
portability_notes: "The failure code list and the prompt are plain text and portable. The flows and the report are built in the Power Platform, and rebuilding them elsewhere would be a rewrite rather than a port — which is a fair trade for how quickly a non-developer got this working."
reused_from:
  - "service-request-routing"
cost_band: "Under $25k"
run_cost: "Under $10k/yr"
procurement:
  - "Existing enterprise licence"
approvals:
  - "Not yet reviewed"
equity_note: "No resident-facing output and no personal data. The internal question we would have to answer before this went into service is whether a coded backlog gets used to compare shops against each other — the shops raised it in the first demo, and the honest answer is that we have not decided, which is one reason this is still a prototype."
no_pii_attestation: true
data_sensitivity:
  - "Internal, non-public data"
data_sources:
  - "Maintenance work order tickets (free text)"
  - "Asset and vehicle register"
  - "Trade and failure code list"
audience: "Internal staff"
data_governance_notes: "Tickets describe equipment, not people, though a requester's name appears on the ticket and is dropped before the text reaches the model. Everything stays in the county tenant. Nothing in this entry or its screenshot is a real ticket."
contact_name: "Maintenance systems analyst"
contact_title: "Public Works — Fleet & Facilities"
contact_email: "maintenance-systems@example.org"
---

## Problem

We take about 22,000 maintenance tickets a year across fleet, buildings and grounds. The ticket form has a category dropdown, and the category dropdown is wrong most of the time — not through carelessness, but because the person raising a ticket knows the symptom ("the van pulls to the right") and not the trade or the failure code.

The consequence is that the backlog is unreadable. We can say how many tickets are open. We cannot say what they are, which shop should have them, or whether the same failure keeps coming back on the same twelve vehicles, which is the question the fleet manager actually asks.

## What we built

A prototype, and we are writing it up at the prototype stage on purpose.

A flow picks up new tickets, strips the requester's name, and asks a model to read the free-text description and propose a trade and a failure code from our own list. The proposals go into a table alongside whatever the shop later coded the ticket as, and a report shows the backlog grouped by shop and trade with a repeat-failure view by asset.

Nothing routes. Nothing is assigned. The proposed code sits next to the ticket and no one is required to look at it.

## How it works

The whole thing is a Power Automate flow, an Azure OpenAI call and a Power BI report, built by an analyst without a developer. That is the point of the experiment as much as the classification is: we wanted to know what a non-developer could get to on tooling we already licence.

The failure code list came from the shops. It is 46 codes across five trades, and getting the shops to agree on it was three meetings and the most valuable output of the project so far — several codes existed in two shops under different names.

## Results

There are no operational results, because it is not in service.

On a bench test over twelve months of past tickets, the model's proposed code matched the code the shop eventually assigned 84% of the time. Agreement was much higher on fleet tickets, which use consistent vocabulary, than on buildings tickets, where "it's leaking" covers four trades. The repeat-failure view found a pattern on a group of light trucks that the fleet manager confirmed and had been describing anecdotally for a year.

What we do not know: whether 84% is good enough, and whether a coded backlog changes anyone's decisions. Both need a supervised trial in one shop, which is what we are asking for.

## Lessons learned

Agreeing the code list is the project. The classifier was a week; the code list was a month and would have been worth doing with no AI involved at all.

Free text quality varies by trade far more than we expected, and an average accuracy number hides that completely. Report it split by whatever your equivalent of a shop is, or you will be surprised in production.

Publish the prototype. We were told to wait until it worked, and we think that is backwards — the code list and the bench test are useful to another county right now, and a catalog of only finished things is a catalog that lies about how this work goes.

## How to reuse

Start from the failure code list, which is linked above and is generic across most public works operations. The classifier is a single prompt over a code list; anyone with a low-code platform and a model endpoint can rebuild it in a week. We adapted the prompt and the shadow-testing approach directly from the city's 311 routing entry in this catalog, which saved us from designing an evaluation from scratch.
