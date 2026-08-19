---
layout: entry
render_with_liquid: false
title: "Grant narrative drafting from an approved library"
slug: grant-narrative-drafting
summary: "A curated library of approved organizational boilerplate plus a drafting workflow, used to produce first-pass narrative sections for funding applications in our own language."
published: 2026-05-19
featured: false
sample: true
impact: "Halved first-draft time on routine narrative sections, from about eight hours to four"
organization: "County government — Grants office"
review_status: "Under review"
solution_type: "Playbook or write-up"
use_case_category: "Communications, media & writing"
area:
  - "Leadership & administration"
  - "Finance, procurement & contracts"
  - "Policy & planning"
stage: "In production"
ai_role: "AI is part of the solution"
ai_types:
  - "Document Q&A (RAG)"
  - "Generative text (LLM)"
ai_tools:
  - "Microsoft 365 Copilot"
  - "SharePoint"
platform:
  - "Enterprise AI workspace"
expertise: "Power user"
readiness:
  - "Needs a paid license"
  - "Needs customization"
  - "Human review built in"
docs_url: "https://docs.example.gov/grant-drafting/playbook"
resources:
  - label: "Fact-check checklist (shared doc)"
    url: "https://docs.example.org/document/d/1k9m2p7q/edit"
  - label: "Library item template and review cadence (shared doc)"
    url: "https://docs.example.org/document/d/9c5x2t8h/edit"
  - label: "Rollout and training deck (PDF)"
    url: "https://docs.example.gov/grant-drafting/rollout-deck.pdf"
license: "Creative Commons (CC BY / CC0)"
access_terms: "The playbook, the checklist and the library template are CC-licensed and free to take. The assistant itself is a licensed product in our own tenant; there is nothing to hand over there."
portability: "Partially — with rework"
portability_notes: "The playbook, the prompts and the library structure are text and move anywhere. The retrieval over past applications relies on how our documents are indexed in SharePoint, and on another platform that wiring would need rebuilding — a week or two, not a project."
cost_band: "Under $25k"
run_cost: "Under $10k/yr"
procurement:
  - "Existing enterprise licence"
approvals:
  - "Not yet reviewed"
equity_note: "Nothing here reaches the public: it drafts our own narrative sections and a grants specialist rewrites them. The honest risk is internal and we have not measured it — an assistant grounded in our past successful applications will keep proposing the programs we have always funded, in the language that has always won, and we do not yet have a way to tell whether that is narrowing what we apply for."
no_pii_attestation: true
data_sensitivity:
  - "Internal, non-public data"
data_sources:
  - "Approved program description library"
  - "Prior grant applications (identifiers removed)"
  - "Published population and economic data tables"
audience: "Internal staff"
data_governance_notes: "Past applications and program descriptions are internal documents; nothing containing client-level or personnel detail is loaded into the library. Drafts live in the working folder for that application and nowhere else, and the library is reviewed on a twelve-month cycle with a named owner per item."
contact_name: "Grants office manager"
contact_title: "County Grants Office"
contact_email: "grants-office@example.org"
---

## Problem

We apply for between 15 and 25 state and federal funding opportunities a year. Roughly 60% of every narrative is material we have written before: organizational history, service area profile, governance structure, evaluation approach, past performance.

Staff rewrote it each time, usually three days before a deadline. The versions drifted apart until nobody could say which description of the county's own programs was current, and two applications submitted in the same month could describe the same service differently.

## What we built

There is no software to hand over. This is a library and a process, which we think is most of what another organization actually needs.

We assembled a SharePoint library of about 120 approved items: program descriptions, evaluation summaries, boilerplate paragraphs, and the public data tables we are cleared to cite. Each item has a named owner and a review date. We then pointed the licensed assistant at that library and only that library. A specialist pastes the section headings from a funding notice and gets a first draft written in our own approved language.

## How it works

The assistant is licensed per seat and runs inside our tenant. Nothing outside the approved library is in scope. Every draft goes through a fact-check step before submission — that checklist is linked above and it is the single most important part of this entry.

The rule that does most of the work: the assistant may not produce a number the drafter has not already supplied. It can arrange, summarise and rewrite what is in the library; it cannot introduce a statistic.

## Results

First-draft time on routine sections fell from roughly eight hours to four across the twelve applications since we started.

The more useful result is that the boilerplate stopped drifting. Because the library is the only source, updating a program description once updates it everywhere the next time someone drafts. Our last three applications described the same programs the same way, which had not been true for years.

## Lessons learned

The assistant is confident about numbers it has never seen. Early drafts contained plausible population figures that appeared nowhere in the library and nowhere in reality. Hence the rule above, and hence the fact-check step surviving every attempt to streamline it.

Novel program design still starts from a blank page. The tool helps a great deal with the 60% that is standard and essentially not at all with the part that wins the award. Anyone promising otherwise has not written a competitive application.

We have not been through a formal review, and the entry says so. Our AI governance body was stood up after this was already in use and we are in its queue.

## How to reuse

Build the library before you buy the licence. A well-curated set of 100 approved documents with named owners is what makes this work; the assistant is the cheap and replaceable part. Budget a review cycle for every item you put in, because whatever is in the library becomes what your organization says about itself — including the parts that were out of date when you copied them in.
