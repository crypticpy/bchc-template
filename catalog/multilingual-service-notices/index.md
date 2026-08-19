---
layout: entry
render_with_liquid: false
title: "Plain-language and multilingual service notices"
slug: multilingual-service-notices
summary: "A prompt kit and review checklist staff use to rewrite public service notices at a seventh-grade reading level and prepare them for translation, without changing what the notice requires."
published: 2026-07-08
verified: 2026-08-11
featured: true
sample: true
impact: "Median reading level of published notices fell from grade 14 to grade 7"
organization: "Mid-sized city — Communications office"
review_status: "Reviewed & approved"
solution_type: "Prompt library"
use_case_category: "Communications, media & writing"
area:
  - "Communications & outreach"
  - "Emergency preparedness"
  - "Leadership & administration"
stage: "In production"
ai_role: "AI is part of the solution"
ai_types:
  - "Generative text (LLM)"
  - "Translation"
ai_tools:
  - "ChatGPT Enterprise"
  - "Claude"
platform:
  - "Enterprise AI workspace"
  - "Desktop or local"
expertise: "Anyone on staff"
readiness:
  - "Ready to deploy"
  - "Human review built in"
docs_url: "https://docs.example.gov/plain-language-kit/guide"
resources:
  - label: "Prompt kit (shared doc)"
    url: "https://docs.example.org/document/d/2b6v8m4c/edit"
  - label: "Reading-level check spreadsheet"
    url: "https://docs.example.org/spreadsheets/d/5n1p3g7d/edit"
  - label: "Before-and-after examples (PDF)"
    url: "https://docs.example.gov/plain-language-kit/examples.pdf"
screenshots:
  - src: /catalog/multilingual-service-notices/screenshots/01.png
    alt: "Side-by-side view of an original water shutoff notice and its plain-language rewrite, with the pre-publication review checklist beneath."
license: "Creative Commons (CC BY / CC0)"
portability: "Yes — platform-agnostic"
portability_notes: "A prompt kit, a style guide and a checklist. They work in any generative text tool, including a free consumer one, though we would not put an unreleased notice into one."
cost_band: "No new spend"
run_cost: "No ongoing cost"
procurement:
  - "Existing enterprise licence"
approvals:
  - "Legal or contracts review"
  - "Community or advisory review"
  - "Equity impact assessment"
equity_note: "This exists for the residents the old notices lost: people reading in a second language, people reading on a phone, people who stopped reading at 'pursuant to'. We measure reading level before and after and a community review panel reads the rewrite before it ships. Translation is where it can quietly go wrong — a rewrite that reads more simply in English can lose precision in translation — so translations are produced and reviewed by human translators, never machine-translated from the rewrite and published unchecked."
no_pii_attestation: true
data_sensitivity:
  - "Public data only"
data_sources:
  - "Draft public notices"
  - "Departmental style guide"
  - "Plain-language glossary of recurring municipal terms"
audience: "Public-facing"
data_governance_notes: "Notices are public documents, but a draft notice about an unannounced service interruption is not yet public — staff use the enterprise workspace for drafts rather than a consumer tool, and the kit says so in the first paragraph."
contact_name: "Plain-language program lead"
contact_title: "Office of Communications"
contact_email: "plainlanguage@example.org"
---

## Problem

A city writes a lot of notices: water shutoffs, street closures, benefit deadlines, permit expirations, boil-water advisories. Most of them are written by the department that owns the underlying rule, and they are written the way the rule is written — long sentences, defined terms, passive voice, the requirement buried in the fourth paragraph.

We measured a year of published notices and the median came out at a fourteenth-grade reading level. Then we watched six residents read three of them, and the pattern was not that people misunderstood the notice. It was that they stopped reading it.

## What we built

No software. A prompt kit and a checklist, plus a glossary of the terms that keep coming back.

The kit is four prompts. One rewrites a notice at a seventh-grade level with the action the reader must take in the first sentence. One extracts every date, dollar amount, address and deadline from the original and checks that all of them survived the rewrite unchanged. One flags any sentence where the rewrite has changed what is legally required rather than how it is said. The last prepares the text for translation by breaking up sentences that translate badly and marking the terms our translators have agreed renderings for.

Staff paste a draft in and get a rewrite back. Then a person does the part that matters.

## How it works

The checklist is the actual product. Every rewritten notice goes through it before publication: the facts check against the original, the required action is in the first sentence, the legal review sign-off is unchanged from the original notice, and the reading level is recorded in the tracking sheet.

Notices that carry a legal requirement — anything that starts a clock or creates an obligation — go back to the originating department and to legal for confirmation that the rewrite says the same thing. About one in five rewrites comes back with a change, and roughly half of those are the rewrite having made something clearer than the rule actually is.

## Results

Median reading level of published notices dropped from grade 14 to grade 7 over five months, across 140 notices. Calls to the relevant service line asking "what does this mean" dropped noticeably after the water and utility notices were redone, though we cannot separate that from a billing change that happened the same quarter, so we are not claiming it.

The result we can stand behind is the one from the review panel: on the redone notices, every panel member could say what they were being asked to do after one read. On the originals, most could not.

## Lessons learned

The model will make a notice simpler than the rule allows. That is the failure mode, it is subtle, and it is why the legal check is not optional. "You must apply by March 1" and "applications are generally accepted until March 1" are different notices, and the rewrite prefers the first one every time.

Do not machine-translate the rewrite. We tried it for a month. A shorter English sentence is not automatically a better Spanish or Vietnamese one, and two of our translators pointed out renderings that were technically accurate and would read as brusque or condescending.

Publish the before-and-after examples internally. Nothing persuaded departments to use the kit like seeing their own notice next to a version their own staff preferred.

## How to reuse

The kit is CC-licensed — take it, replace the glossary with your own recurring terms, and keep the checklist. The two things we would tell anyone starting: get the legal check agreed before the first notice goes out, and record reading level for every notice from day one, because the number is what makes the case internally.
