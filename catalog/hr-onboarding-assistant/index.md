---
layout: entry
render_with_liquid: false
title: "New-hire onboarding checklist assistant"
slug: hr-onboarding-assistant
summary: "A chat assistant that built a personalised onboarding checklist for each new hire and opened the routine access requests for them. Retired in 2026 when the HR system shipped the same feature."
published: 2026-01-27
updated: 2026-07-02
featured: false
sample: true
impact: "Cut help desk tickets per new hire from 11 to 3 during the eighteen months it ran"
organization: "Mid-sized city — Human Resources"
review_status: "Deprecated"
solution_type: "Internal tool"
use_case_category: "Administrative & task automation"
area:
  - "HR & workforce"
  - "IT & operations"
  - "Staff & partner coordination"
stage: "Paused or retired"
ai_role: "AI is part of the solution"
ai_types:
  - "Chat assistant"
  - "Agents & automation"
ai_tools:
  - "Power Virtual Agents"
  - "Power Automate"
  - "SharePoint"
platform:
  - "Low-code platform"
expertise: "Power user"
readiness:
  - "Reference only"
  - "Human review built in"
docs_url: "https://docs.example.gov/onboarding-assistant/retrospective"
resources:
  - label: "Retrospective and decommissioning note (PDF)"
    url: "https://docs.example.gov/onboarding-assistant/retrospective.pdf"
  - label: "Task library by role (spreadsheet)"
    url: "https://docs.example.org/spreadsheets/d/3f7g9h2j/edit"
screenshots:
  - src: /catalog/hr-onboarding-assistant/screenshots/01.png
    alt: "Onboarding checklist screen showing tasks grouped by before day one, week one and week two, with completed items ticked and access requests marked as opened."
license: "Not open source — description only"
access_terms: "The tool has been decommissioned and there is nothing to install. The task library and the retrospective are linked above and are the reason this entry is still here."
portability: "Partially — with rework"
portability_notes: "The task library is a spreadsheet and moves anywhere. The assistant itself was built in the Power Platform against our own HR and identity systems, and by the time it was retired the platform-specific parts were the majority of it."
cost_band: "No new spend"
run_cost: "No ongoing cost"
procurement:
  - "Existing enterprise licence"
approvals:
  - "Privacy review"
  - "Labor or workforce consultation"
equity_note: "It reached every new hire, which was the argument for building it: the informal version of onboarding — a manager who remembers to explain things — was reliably better for people who already knew someone in the organization. We checked completion rates by department and by whether the hire was internal or external, and the gap between them narrowed. Nothing about a person's performance was inferred or recorded."
no_pii_attestation: true
data_sensitivity:
  - "Personal information (PII)"
  - "Internal, non-public data"
data_sources:
  - "HR position and start date records"
  - "Role-based task library"
  - "IT access request catalog"
audience: "Internal staff"
data_governance_notes: "The assistant read a new hire's role, start date and work location, and nothing else from the HR record. Conversation logs were kept 90 days and were never available to a hire's supervisor. All of it was deleted at decommissioning under a documented plan, which is in the retrospective."
contact_name: "HR operations lead"
contact_title: "Human Resources"
contact_email: "hr-operations@example.org"
---

## Problem

Onboarding a new employee involved somewhere between 15 and 30 discrete tasks depending on the role, spread across HR, IT, payroll, facilities and the hiring department, and described in a 40-page handbook that nobody read on their first week.

The visible symptom was help desk volume: an average of 11 tickets per new hire in the first month, most of them variations on "I don't have access to the thing I was told to use."

## What we built

A chat assistant in our low-code platform. On a hire's start date it generated a checklist from their role, start date and work location, grouped into before day one, week one and week two. The hire and their supervisor saw the same list.

For the routine access requests — the ones that are determined entirely by the role — it opened the request automatically. Everything else it explained and pointed at.

A person approved every access request. The assistant drafted and tracked; it never granted anything.

## Results

Help desk tickets per new hire fell from 11 to 3 within four months and stayed there for the eighteen months the tool ran. Checklist completion at 30 days went from something we could not measure at all to 94%.

Supervisors used it more than we expected and hires used it less. The most common feedback from hires was that they wanted the list in email, not in a chat window, which we should have taken more seriously than we did.

## Why it was retired

Our HR system's vendor shipped a native onboarding checklist feature in a 2026 release, covering most of what this did, integrated with the record we were querying through a connector anyway. Continuing to run a parallel tool would have meant two task libraries drifting apart, and we had already watched that happen once with the handbook.

We decommissioned it in July 2026 and moved the task library into the vendor's feature. The entry stays here because the retrospective is the useful part: what the tool did, what the replacement does not do as well, and what we would keep.

## Lessons learned

The task library was the asset and the assistant was the interface. Eighteen months later the library moved to a completely different system in an afternoon, which is the clearest possible statement of where the value was.

Build the thing that gets replaced. We would build it again knowing it had a two-year life, because the alternative was two more years of eleven tickets per hire while waiting for a vendor roadmap.

Ask people how they want to be reached before choosing the interface. A chat assistant was the platform's default shape, not a decision, and email would probably have been used more.

What the replacement lost: our version explained *why* a task existed, in a sentence written by whoever owned it. The vendor's checklist is a list of task names. We are trying to get the explanations back in as task descriptions.

## How to reuse

There is nothing to install. Take the task library structure — a role, a task, an owner, a due offset from start date, and one sentence of why — and build it before you build anything else. If your HR system now offers a checklist feature, use it; that is the honest recommendation from the people who built the alternative.
