---
layout: entry
render_with_liquid: false
title: "Clause summaries for procurement review"
slug: procurement-clause-review
summary: "A licensed product that extracts clauses from scanned vendor agreements, summarizes them in plain language, and flags where they differ from our standard terms or are missing entirely."
published: 2026-06-02
verified: 2026-07-30
featured: false
sample: true
impact: "Cut first-pass contract review from five business days to one"
organization: "State agency — Procurement division"
review_status: "Reviewed & approved"
solution_type: "Vendor product"
use_case_category: "Administrative & task automation"
area:
  - "Finance, procurement & contracts"
  - "Legal & compliance"
stage: "Pilot"
ai_role: "AI is part of the solution"
ai_types:
  - "Document Q&A (RAG)"
  - "Classification & NLP"
  - "Computer vision"
ai_tools:
  - "Vendor-hosted clause extraction service"
  - "Optical character recognition (vendor-hosted)"
platform:
  - "Vendor / SaaS hosted"
vendor: "Commercial contract-analytics vendor"
expertise: "Contractor or vendor"
readiness:
  - "Needs a paid license"
  - "Needs a data agreement"
  - "Human review built in"
docs_url: "https://docs.example.gov/contract-review-pilot/evaluation"
resources:
  - label: "Pilot evaluation memo (PDF)"
    url: "https://docs.example.gov/contract-review-pilot/evaluation-memo.pdf"
  - label: "Vendor question set we used (shared doc)"
    url: "https://docs.example.org/document/d/4q8w1z6y/edit"
  - label: "Clause comparison template"
    url: "https://docs.example.org/spreadsheets/d/8v3n5k1r/edit"
screenshots:
  - src: /catalog/procurement-clause-review/screenshots/01.png
    alt: "Clause summary table listing indemnification, data ownership and other clauses with page references, plain-language summaries and comparison flags."
license: "Not open source — description only"
access_terms: "This is a commercial product; what we are sharing is the write-up. The evaluation memo, the question set we put to the vendor and the clause comparison template are all linked above and are free to reuse. Contact us if you want to talk through the pricing or the contract terms we negotiated."
portability: "No — tied to its platform"
portability_notes: "The product is the vendor's hosted service end to end. What transfers is the evaluation approach and the clause taxonomy, not software. If the vendor disappeared tomorrow we would keep the taxonomy and lose the tool."
cost_band: "$25k–$100k"
run_cost: "Over $50k/yr"
procurement:
  - "Cooperative or piggyback contract"
approvals:
  - "Legal or contracts review"
  - "Security review or authority to operate"
  - "Records retention review"
equity_note: "Internal to procurement, with no output that reaches the public. The thing we watch is whether the tool flags unfamiliar contract language more often for small and minority-owned vendors, whose paperwork looks least like the large vendors whose agreements the product has seen most of. A flag is only ever a prompt for a specialist to read the clause; it is never a score, and nothing about a bidder is derived from it."
no_pii_attestation: true
data_sensitivity:
  - "Internal, non-public data"
data_sources:
  - "Executed and draft vendor agreements"
  - "Standard terms and conditions library"
audience: "Internal staff"
data_governance_notes: "Agreements are uploaded to the vendor's tenant under a data processing addendum that fixes the processing location, sets a 90-day retention limit and prohibits training on our documents. Draft agreements under active negotiation are excluded from the pilot entirely. No agreement text appears in this entry or its screenshot."
contact_name: "Contracts review supervisor"
contact_title: "Procurement Division"
contact_email: "contracts-review@example.org"
---

## Problem

Our team of three reviews around 200 vendor agreements a year. Many arrive as scanned PDFs from vendors who printed our template, wrote on it and scanned it back. The first pass — reading the whole document, finding the clauses that differ from our standard terms, and noticing the clauses that are not there at all — took a specialist most of a week per contract.

The missing clauses were the expensive ones. A clause that differs is visible; a clause that was quietly deleted is invisible unless someone is reading with a checklist in hand, and those were the gaps that used to surface after signature.

## What we built

We licensed a commercial product instead of building anything, and we are writing it up because the evaluation is the reusable part.

The tool reads a scanned agreement, extracts clauses, writes a plain-language summary of each, and compares them against a library of our own standard terms that we uploaded during setup. The output is a review worksheet: one row per clause, with the page it came from, a summary, and a flag saying whether it matches our template, differs from it, or is absent.

## How it works

Scanned pages go through the vendor's OCR first, which is why output quality tracks scan quality closely. The comparison is against our own clause library, so the tool is only as good as the standard terms you give it — normalising ours took longer than the vendor's implementation did.

Nothing is decided by the tool. A contracts specialist opens every flagged clause in the source document before it goes anywhere. What changed is what gets read first, not what gets approved.

## Results

Across 38 contracts in the pilot, first-pass review dropped from a median of five business days to one. The tool found an average of two missing standard clauses per contract — usually records retention or right to audit — which is the number that persuaded our leadership.

Accuracy on badly scanned documents was noticeably worse: roughly one in six contracts needed a page rescanned before the extraction was usable. Two contracts in the pilot produced summaries that misstated a liability cap, both caught in review, both from pages where the OCR had merged two columns.

## Lessons learned

Budget for the standard terms library. Ours existed as a Word document carrying twelve years of tracked comments, and normalising it was three weeks of work we would have had to do eventually anyway. That library is now used in places the tool is not.

Ask the vendor where documents are processed, what is retained, and whether anything is used for training — in writing, before the pilot, not during contract negotiation. Our question set is linked above; it is nine questions and it took one meeting.

Do not put live negotiations in. A draft under active negotiation is the one document where a leak has an immediate cost, and there was no version of the pilot that needed them.

## How to reuse

This is a paid product on someone else's infrastructure, so the path is procurement rather than deployment. We bought off another agency's cooperative contract, which removed about four months from the timeline. The evaluation memo is the document we used to make the case internally and is probably more reusable than anything else here.
