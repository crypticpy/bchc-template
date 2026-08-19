---
layout: entry
render_with_liquid: false
title: "Redaction assist for public records requests"
slug: records-request-redaction
summary: "Proposes redactions on documents responsive to a public records request, with every proposal tied to the exemption it claims and reviewed by a records analyst before release."
published: 2026-04-28
verified: 2026-08-04
featured: false
sample: true
impact: "First-pass review of a 500-page response went from about 14 hours to 4"
organization: "County government — Records & open government office"
review_status: "Reviewed & approved"
solution_type: "Internal tool"
use_case_category: "Administrative & task automation"
area:
  - "Legal & compliance"
  - "Data & informatics"
  - "IT & operations"
stage: "Pilot"
ai_role: "AI is part of the solution"
ai_types:
  - "Classification & NLP"
  - "Computer vision"
ai_tools:
  - "Llama 3 (self-hosted)"
  - "PaddleOCR"
  - "Presidio"
  - "Python"
platform:
  - "On-premises"
expertise: "Developer"
readiness:
  - "Needs customization"
  - "Needs a data agreement"
  - "Human review built in"
docs_url: "https://docs.example.gov/records-redaction-assist/pilot-report"
resources:
  - label: "Exemption mapping table (shared doc)"
    url: "https://docs.example.org/spreadsheets/d/6t4r8w2q/edit"
  - label: "Reviewer protocol and error log template (PDF)"
    url: "https://docs.example.gov/records-redaction-assist/reviewer-protocol.pdf"
screenshots:
  - src: /catalog/records-request-redaction/screenshots/01.png
    alt: "Redaction review screen listing proposed redactions with the exemption claimed, a confidence indicator and accept or reject controls for the analyst."
license: "Not open source — available on request"
access_terms: "The code is tangled with our document management system, so we share it with other public agencies on request rather than publishing it. Email the contact below and we will walk through it and hand over the exemption mapping, which is the part that transfers cleanly."
portability: "Yes — platform-agnostic"
portability_notes: "Everything runs on our own hardware with open-weight models and open-source libraries; there is no hosted service to replace. Another agency's work is in the exemption mapping and the connector to whatever document system they use, not in the model layer."
cost_band: "$100k–$500k"
run_cost: "$10k–$50k/yr"
procurement:
  - "Competitive solicitation"
approvals:
  - "Privacy review"
  - "Security review or authority to operate"
  - "Legal or contracts review"
  - "Records retention review"
  - "AI governance body"
equity_note: "A records request is one of the few tools a resident has that does not require a lawyer, and the people who wait longest for a response are the ones without one. Faster review is the point. The risk runs the other way too — an over-redacting assistant is a transparency failure dressed as caution — so we log every proposal the analyst rejects, by exemption, and report over-redaction and under-redaction rates separately in the quarterly pilot review."
no_pii_attestation: true
data_sensitivity:
  - "Personal information (PII)"
  - "Internal, non-public data"
data_sources:
  - "Documents gathered in response to a records request"
  - "Statutory exemption mapping table"
  - "Prior released records with their applied redactions"
audience: "Internal staff"
data_governance_notes: "Responsive documents routinely contain personal information — that is why they need redaction — and nothing leaves county hardware. Models are open-weight and run locally; no document is sent to any external API and nothing is used for training. The proposal log is kept for two years so that a released response can be reconstructed and audited, then destroyed under the records schedule. No real document appears in this entry or its screenshot."
contact_name: "Public records program manager"
contact_title: "Records & Open Government"
contact_email: "records-program@example.org"
---

## Problem

We close about 3,400 public records requests a year with four analysts. Most requests are small, but the ones that hurt are large document sets where an analyst reads every page looking for the same handful of things: personal contact details, security information, and the narrow categories our state's law lets us withhold. A 500-page response took roughly fourteen hours of reading, and our median response time had drifted well past the statutory clock.

Redaction is also the highest-stakes routine task in the office. Missing one thing releases something that should not have been released; redacting too much is a transparency failure that the requester usually has no practical way to challenge.

## What we built

A tool that opens a response set, proposes redactions, and hands the analyst a review screen. Every proposal names the exemption it claims and points at the exact text and page. The analyst accepts or rejects each one, and only what the analyst accepts is applied to the released copy.

The tool cannot apply a redaction on its own, and it cannot release anything. Those are hard constraints in the code, not a policy we wrote down.

## How it works

Documents are OCRed if they need it, then run through two passes. The first is a conventional entity detector — names, addresses, account numbers, dates of birth — which is fast, boring and catches most of the volume. The second is an open-weight language model running on our own hardware, prompted with our exemption mapping, which handles the judgement categories: is this paragraph attorney-client material, is this a security detail about a facility.

Both passes only ever propose. The review screen sorts proposals so that the model's low-confidence judgements are read first, which is the opposite of what feels natural and is the right order — an analyst is most useful where the tool is least sure.

Every accept and reject is logged. That log is how we know whether the thing is working, and it is also how a supervisor reconstructs a release six months later.

## Results

Across the first 62 requests in the pilot, first-pass review of a 500-page response fell from about fourteen hours to four. Analysts accepted 88% of proposals unchanged.

The rejections are the interesting number. Nine percent were over-redaction — the tool proposing to withhold something plainly releasable — and 3% were the analyst deciding a different exemption applied. Under-redaction, the failure that matters most, showed up in 14 documents across the pilot, all caught in review, all of them personal details written into a document in an unusual place: a phone number inside a scanned handwritten note, an address in an image of a form.

That is the honest headline: the tool is good at volume and bad at the weird cases, so the analyst's job changed rather than shrank.

## Lessons learned

Build the exemption mapping first and make legal own it. Ours took two months and one long argument, and it is now the document the office uses for training new analysts regardless of the tool.

Log rejections from day one. We nearly shipped without the log and would have had no way to answer "is it over-redacting?" — which was the first question our AI governance body asked, and the right one.

Keep it on your own hardware if the documents are unreleased. That decision closed the privacy review in one meeting instead of six, and it cost us a GPU server.

## How to reuse

The transferable pieces are the exemption mapping, the reviewer protocol and the error log template — all linked above, all plain documents. The software is a connector to our document management system with a model behind it; another agency will write its own connector, and the model layer is entirely open-source components. Expect the legal work to outweigh the engineering by a wide margin.
