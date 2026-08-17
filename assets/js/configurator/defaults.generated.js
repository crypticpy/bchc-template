/**
 * GENERATED FILE — do not edit by hand.
 *
 * Built from _data/site.yml, _data/theme.yml, _data/schema.yml, _data/navigation.yml and _config.yml
 * by scripts/build_defaults.mjs (run via `npm run generate`).
 *
 * The browser wizard cannot read the repository at runtime, so the shipped
 * configuration is compiled into this module. CI fails when it is stale.
 */

/** Parsed _data/site.yml. */
export const SITE = {
  "name": "AI Use Case Catalog",
  "tagline": "Shared AI solutions from big-city health departments",
  "description": "A shared catalog of AI use cases, tools, and lessons learned from Big Cities Health Coalition member health departments.",
  "organization": {
    "name": "Big Cities Health Coalition",
    "short_name": "BCHC",
    "url": "https://www.bigcitieshealth.org",
    "contact_email": "info@bigcitieshealth.org"
  },
  "logo": {
    "image": "",
    "text": "BCHC"
  },
  "github": {
    "repository": "crypticpy/bchc-template",
    "branch": "main"
  },
  "modules": {
    "catalog": true,
    "submit": true,
    "carousel": true,
    "stats": true,
    "events": false,
    "cohorts": false,
    "resources": false
  },
  "hero": {
    "eyebrow": "Big Cities Health Coalition · AI Community of Practice",
    "title": "What health departments are building with AI",
    "lead": "Browse real solutions from member cities — source code, cloud deployments, vendor implementations and write-ups — and share your own so others can learn, reuse and adapt.",
    "primary_cta": {
      "label": "Browse the catalog",
      "url": "/catalog/"
    },
    "secondary_cta": {
      "label": "Share your use case",
      "url": "/submit/"
    }
  },
  "home": {
    "featured_count": 6,
    "recent_count": 6,
    "hero_latest_count": 3,
    "highlights": [
      {
        "eyebrow": "Reuse, don't rebuild",
        "title": "Start from what already works",
        "body": "Every entry links to code, deployments or vendor details so your team can evaluate and adapt quickly."
      },
      {
        "eyebrow": "Learn from peers",
        "title": "Honest notes on what it took",
        "body": "Entries capture data sources, tools, staffing and lessons learned — not just the demo."
      },
      {
        "eyebrow": "Contribute",
        "title": "Sharing takes five minutes",
        "body": "Fill out the submission form. Maintainers review it in a pull request and it goes live automatically."
      }
    ]
  },
  "submit": {
    "intro": "Share an AI use case, tool or project with the coalition. Submissions open a GitHub issue for the maintainers to review; nothing is published until it is approved.",
    "review_note": "Please do not include protected health information, credentials or non-public data. Link out to repositories and documents rather than pasting sensitive content.",
    "fallback_email": "info@bigcitieshealth.org"
  },
  "footer": {
    "about": "A collaborative catalog maintained by the coalition's AI community of practice. Content is contributed by member health departments and reviewed before publication.",
    "links": [
      {
        "label": "Big Cities Health Coalition",
        "url": "https://www.bigcitieshealth.org"
      },
      {
        "label": "Submit an entry",
        "url": "/submit/"
      },
      {
        "label": "Maintainer guide",
        "url": "https://github.com/crypticpy/bchc-template/blob/main/docs/admin-guide.md"
      }
    ],
    "copyright": "Big Cities Health Coalition"
  },
  "analytics": {
    "plausible_domain": ""
  }
};

/** Parsed _data/theme.yml. */
export const THEME = {
  "colors": {
    "primary": "#1D4E89",
    "primary_dark": "#12305A",
    "secondary": "#0F6357",
    "accent": "#E07A2F",
    "ink": "#1B2430",
    "muted": "#5A6573",
    "line": "#D9E0E8",
    "line_strong": "#7C8A9B",
    "surface": "#F5F7FA",
    "card": "#FFFFFF",
    "on_dark": "#F7F9FC",
    "warn": "#B45309"
  },
  "fonts": {
    "heading": "Source Sans 3",
    "body": "Inter",
    "google_fonts_url": ""
  },
  "radius": "soft"
};

/** Parsed _data/schema.yml. */
export const SCHEMA = {
  "entry": {
    "singular": "Use case",
    "plural": "Use cases",
    "path": "catalog",
    "sort": "published",
    "sort_order": "desc"
  },
  "sections": {
    "details": "Details",
    "links": "Links & resources",
    "contact": "Contact"
  },
  "groups": [
    {
      "key": "about",
      "title": "About",
      "description": "What it is, who built it, and what it changed."
    },
    {
      "key": "build",
      "title": "How it's built",
      "description": "The AI involved and where it runs."
    },
    {
      "key": "reuse",
      "title": "Reuse",
      "description": "What it would take for another team to use this.",
      "placement": "rail"
    },
    {
      "key": "data",
      "title": "Data & access",
      "description": "What data it touches and who sees the output."
    },
    {
      "key": "contact",
      "title": "Contact",
      "description": "Someone others can reach out to.",
      "placement": "rail"
    },
    {
      "key": "story",
      "title": "The story",
      "description": "Problem, approach, what it took, results and lessons."
    }
  ],
  "fields": [
    {
      "key": "title",
      "label": "Title",
      "prompt": "What is it called?",
      "type": "text",
      "required": true,
      "group": "about",
      "weight": 1,
      "placeholder": "Automated 311 call triage with LLM classification",
      "description": "Short, descriptive name of the solution or project."
    },
    {
      "key": "summary",
      "label": "One-sentence summary",
      "prompt": "In one or two sentences, what does it do?",
      "type": "textarea",
      "required": true,
      "group": "about",
      "weight": 2,
      "description": "One or two sentences shown on the catalog card. Plain language, no jargon.",
      "placeholder": "Classifies incoming public health hotline calls by urgency and topic so nurses see the highest-priority cases first."
    },
    {
      "key": "impact",
      "label": "Result in one line",
      "prompt": "What is the single most concrete result so far?",
      "type": "text",
      "group": "about",
      "weight": 3,
      "card": "line",
      "icon": "trending-up",
      "search": true,
      "placeholder": "Cut brief turnaround from 3 days to 1 hour",
      "description": "Optional. The single most concrete outcome so far — a number if you have one."
    },
    {
      "key": "organization",
      "label": "Organization",
      "prompt": "Which organization is sharing this?",
      "type": "text",
      "required": true,
      "group": "about",
      "weight": 4,
      "facet": true,
      "card": "meta",
      "search": true,
      "icon": "building",
      "placeholder": "Chicago Department of Public Health",
      "description": "The organization sharing this entry — a health department, city, agency or member organization."
    },
    {
      "key": "solution_type",
      "label": "What is being shared",
      "prompt": "What are you sharing?",
      "type": "select",
      "required": true,
      "group": "about",
      "weight": 5,
      "facet": true,
      "card": "badge",
      "icon": "layers",
      "options": [
        "Source code",
        "Cloud deployment",
        "Vendor product",
        "Internal tool",
        "Playbook or write-up"
      ],
      "option_meta": {
        "Source code": {
          "icon": "code",
          "description": "A repository (GitHub, GitLab, Azure DevOps…) others can clone."
        },
        "Cloud deployment": {
          "icon": "cloud",
          "description": "A deployable stack or template on AWS, Azure, GCP or similar."
        },
        "Vendor product": {
          "icon": "building",
          "description": "A commercial product or partnership, described so others can evaluate it."
        },
        "Internal tool": {
          "icon": "lock",
          "description": "Built and used in-house; the write-up is what's shared, not the code."
        },
        "Playbook or write-up": {
          "icon": "book-open",
          "description": "Guidance, policy, evaluation or lessons — no software to install."
        }
      },
      "description": "Pick the closest match."
    },
    {
      "key": "area",
      "label": "Area of work",
      "prompt": "Which areas of work does it apply to?",
      "type": "multiselect",
      "required": true,
      "group": "about",
      "weight": 6,
      "facet": true,
      "card": "chip",
      "icon": "tag",
      "options": [
        "Epidemiology & surveillance",
        "Clinical & community services",
        "Environmental health",
        "Emergency preparedness",
        "Communications & outreach",
        "Data & informatics",
        "Policy & planning",
        "HR & workforce",
        "Finance, procurement & contracts",
        "IT & operations",
        "Legal & compliance",
        "Staff & partner coordination",
        "Leadership & administration"
      ],
      "option_meta": {
        "Epidemiology & surveillance": {
          "short": "Epi & surveillance"
        },
        "Clinical & community services": {
          "short": "Clinical"
        },
        "Environmental health": {
          "short": "Environmental"
        },
        "Emergency preparedness": {
          "short": "Preparedness"
        },
        "Communications & outreach": {
          "short": "Communications"
        },
        "Data & informatics": {
          "short": "Data"
        },
        "Policy & planning": {
          "short": "Policy"
        },
        "HR & workforce": {
          "short": "HR & workforce"
        },
        "Finance, procurement & contracts": {
          "short": "Procurement"
        },
        "IT & operations": {
          "short": "IT & ops"
        },
        "Legal & compliance": {
          "short": "Legal"
        },
        "Staff & partner coordination": {
          "short": "Coordination"
        },
        "Leadership & administration": {
          "short": "Leadership"
        }
      },
      "description": "Program areas and business functions this applies to. Select all that fit — it doesn't have to be a health program."
    },
    {
      "key": "stage",
      "label": "Stage",
      "prompt": "Where is it today?",
      "type": "select",
      "required": true,
      "group": "about",
      "weight": 7,
      "facet": true,
      "card": "meta",
      "icon": "flag",
      "options": [
        "Idea / exploring",
        "Pilot",
        "In production",
        "Paused or retired"
      ],
      "option_meta": {
        "Idea / exploring": {
          "short": "Exploring",
          "description": "Scoping or prototyping; nothing in regular use yet."
        },
        "Pilot": {
          "description": "In limited use with real users while it is evaluated."
        },
        "In production": {
          "short": "In production",
          "tone": "primary",
          "description": "In regular, supported use."
        },
        "Paused or retired": {
          "short": "Retired",
          "description": "No longer active — shared for the lessons."
        }
      },
      "description": "How far along it is — pick the stage that best matches real use."
    },
    {
      "key": "ai_role",
      "label": "How AI is involved",
      "prompt": "Is the AI in the product, or was AI used to build it?",
      "type": "select",
      "required": true,
      "group": "build",
      "weight": 1,
      "facet": true,
      "icon": "sparkles",
      "options": [
        "AI is part of the solution",
        "AI was used to build it",
        "Both"
      ],
      "option_meta": {
        "AI is part of the solution": {
          "short": "In the solution",
          "description": "The running system uses AI (a model, an assistant, an automation)."
        },
        "AI was used to build it": {
          "short": "Used to build it",
          "description": "AI tools helped write the code, docs or analysis, but the product itself doesn't use AI."
        },
        "Both": {
          "description": "AI is in the product and was used to build it."
        }
      },
      "description": "Is the AI in the product, or was it used to make the product?"
    },
    {
      "key": "ai_types",
      "label": "Types of AI",
      "prompt": "What kinds of AI does it use?",
      "type": "multiselect",
      "group": "build",
      "weight": 2,
      "facet": true,
      "icon": "cpu",
      "options": [
        "Generative text (LLM)",
        "Chat assistant",
        "Document Q&A (RAG)",
        "Classification & NLP",
        "Prediction & forecasting",
        "Computer vision",
        "Speech & transcription",
        "Translation",
        "Agents & automation",
        "Rules-based (no ML)"
      ],
      "option_meta": {
        "Generative text (LLM)": {
          "short": "Generative text",
          "description": "Drafts, summarizes or rewrites text with a large language model."
        },
        "Chat assistant": {
          "short": "Chat",
          "description": "A conversational interface for staff or the public."
        },
        "Document Q&A (RAG)": {
          "short": "Document Q&A",
          "description": "Answers questions from your own documents (retrieval-augmented generation)."
        },
        "Classification & NLP": {
          "short": "Classification",
          "description": "Sorts, tags or extracts information from text."
        },
        "Prediction & forecasting": {
          "short": "Prediction",
          "description": "Predicts risk, demand or trends from historical data."
        },
        "Computer vision": {
          "short": "Vision",
          "description": "Reads images, video or scanned documents."
        },
        "Speech & transcription": {
          "short": "Speech",
          "description": "Transcribes or understands spoken audio."
        },
        "Translation": {
          "description": "Translates between languages."
        },
        "Agents & automation": {
          "short": "Agents",
          "description": "Multi-step automation where the AI takes actions."
        },
        "Rules-based (no ML)": {
          "short": "Rules-based",
          "description": "Deterministic logic — shared here for comparison."
        }
      },
      "description": "Select all that apply."
    },
    {
      "key": "ai_tools",
      "label": "AI tools & models",
      "prompt": "Which AI tools, models or services does it use?",
      "type": "list",
      "group": "build",
      "weight": 3,
      "facet": true,
      "search": true,
      "icon": "terminal",
      "placeholder": "Azure OpenAI GPT-4o, LangChain, custom scikit-learn model",
      "description": "Comma-separated. Name the models, platforms or libraries that matter."
    },
    {
      "key": "platform",
      "label": "Where it runs",
      "prompt": "Where does it run?",
      "type": "multiselect",
      "group": "build",
      "weight": 4,
      "facet": true,
      "icon": "server",
      "options": [
        "AWS",
        "Microsoft Azure",
        "Google Cloud",
        "On-premises",
        "Vendor / SaaS hosted",
        "Enterprise AI workspace",
        "Low-code platform",
        "Desktop or local"
      ],
      "option_meta": {
        "Microsoft Azure": {
          "short": "Azure"
        },
        "Google Cloud": {
          "short": "GCP"
        },
        "On-premises": {
          "short": "On-prem"
        },
        "Vendor / SaaS hosted": {
          "short": "SaaS",
          "description": "Runs on the vendor's infrastructure."
        },
        "Enterprise AI workspace": {
          "short": "AI workspace",
          "description": "Microsoft 365 Copilot, ChatGPT Enterprise, Gemini for Workspace and similar."
        },
        "Low-code platform": {
          "short": "Low-code",
          "description": "Power Platform, Airtable, n8n and similar."
        },
        "Desktop or local": {
          "short": "Local",
          "description": "Runs on a laptop or workstation."
        }
      },
      "description": "Select all that apply."
    },
    {
      "key": "vendor",
      "label": "Vendor or partner",
      "prompt": "Is a vendor or partner involved?",
      "type": "text",
      "group": "build",
      "weight": 5,
      "section": "details",
      "search": true,
      "placeholder": "Acme Health AI",
      "description": "If a vendor built or hosts the solution, name them here."
    },
    {
      "key": "expertise",
      "label": "Skills needed to set it up",
      "prompt": "Who would need to be involved to set this up?",
      "type": "select",
      "required": true,
      "group": "reuse",
      "weight": 1,
      "facet": true,
      "card": "icon",
      "icon": "academic-cap",
      "options": [
        "Anyone on staff",
        "Power user",
        "Analyst or data scientist",
        "Developer",
        "Contractor or vendor"
      ],
      "option_meta": {
        "Anyone on staff": {
          "short": "Anyone",
          "icon": "user",
          "description": "No technical skills — follow the instructions."
        },
        "Power user": {
          "icon": "adjustments",
          "description": "Someone comfortable with spreadsheets, forms and low-code tools."
        },
        "Analyst or data scientist": {
          "short": "Analyst",
          "icon": "chart-bar",
          "description": "Someone who works in Python, R or SQL."
        },
        "Developer": {
          "icon": "code",
          "description": "A software developer to deploy or adapt it."
        },
        "Contractor or vendor": {
          "short": "Contractor",
          "icon": "wrench",
          "description": "Outside help is required to stand this up."
        }
      },
      "description": "The least technical person who could get this running."
    },
    {
      "key": "readiness",
      "label": "Readiness",
      "prompt": "Before someone reuses this, what should they know?",
      "type": "multiselect",
      "group": "reuse",
      "weight": 2,
      "facet": true,
      "card": "icon",
      "icon": "rocket",
      "options": [
        "Ready to deploy",
        "Guided setup",
        "Needs customization",
        "Needs a contractor",
        "Needs a paid license",
        "Needs a data agreement",
        "Human review built in",
        "Reference only"
      ],
      "option_meta": {
        "Ready to deploy": {
          "short": "Ready",
          "icon": "rocket",
          "tone": "primary",
          "description": "Can be used as-is with minimal configuration."
        },
        "Guided setup": {
          "short": "Guided setup",
          "icon": "wand",
          "description": "A wizard or script walks you through installation."
        },
        "Needs customization": {
          "short": "Needs config",
          "icon": "adjustments",
          "description": "Your team will need to adapt it before use."
        },
        "Needs a contractor": {
          "short": "Needs vendor",
          "icon": "wrench",
          "description": "Requires a contractor or vendor to implement."
        },
        "Needs a paid license": {
          "short": "Paid license",
          "icon": "credit-card",
          "description": "Depends on a paid product, API or subscription."
        },
        "Needs a data agreement": {
          "short": "Data agreement",
          "icon": "document",
          "description": "A data-sharing or BAA-type agreement is required."
        },
        "Human review built in": {
          "short": "Human review",
          "icon": "eye",
          "description": "A person checks the AI's output before it is used."
        },
        "Reference only": {
          "short": "Reference",
          "icon": "book-open",
          "description": "Documentation and lessons — not something to deploy."
        }
      },
      "description": "How much work is left between finding this and running it? Select all that apply."
    },
    {
      "key": "repo_url",
      "label": "Source code",
      "prompt": "Where is the source code?",
      "type": "url",
      "group": "reuse",
      "weight": 3,
      "section": "links",
      "icon": "code",
      "placeholder": "https://github.com/your-org/your-project",
      "description": "GitHub, GitLab, Azure DevOps or any public repository."
    },
    {
      "key": "demo_url",
      "label": "Live site or demo",
      "prompt": "Is there a live site or demo?",
      "type": "url",
      "group": "reuse",
      "weight": 4,
      "section": "links",
      "icon": "globe",
      "placeholder": "https://example.org/app"
    },
    {
      "key": "docs_url",
      "label": "Documentation or write-up",
      "prompt": "Is there documentation or a write-up?",
      "type": "url",
      "group": "reuse",
      "weight": 5,
      "section": "links",
      "icon": "document",
      "placeholder": "https://example.org/docs",
      "description": "Slides, a report, a blog post, or a vendor case study."
    },
    {
      "key": "resources",
      "label": "Other resources",
      "prompt": "Anything else worth linking?",
      "type": "links",
      "group": "reuse",
      "weight": 6,
      "section": "links",
      "icon": "link",
      "placeholder": "Evaluation report | https://drive.google.com/…",
      "description": "Anything else worth linking — shared drives, SharePoint, model cards, container images, vendor pages. One per line as “Label | URL”."
    },
    {
      "key": "screenshots",
      "label": "Screenshots",
      "prompt": "Can you show it in use?",
      "type": "images",
      "group": "reuse",
      "weight": 7,
      "icon": "image",
      "description": "Up to eight PNG, JPEG, GIF or WebP images of the tool in use (15 MB total). Make sure no personal or protected information is visible."
    },
    {
      "key": "deck_pdf",
      "label": "Slide deck or one-pager (PDF)",
      "prompt": "Do you have a slide deck or one-pager?",
      "type": "file",
      "filename": "deck.pdf",
      "thumbnail": true,
      "group": "reuse",
      "weight": 8,
      "section": "links",
      "icon": "presentation",
      "description": "Optional. After the pull request is created, upload deck.pdf into the entry folder and a thumbnail is generated automatically."
    },
    {
      "key": "data_sensitivity",
      "label": "Data it touches",
      "prompt": "What kind of data does it touch?",
      "type": "multiselect",
      "required": true,
      "group": "data",
      "weight": 1,
      "facet": true,
      "card": "icon",
      "icon": "shield",
      "options": [
        "Public data only",
        "De-identified data",
        "Internal, non-public data",
        "Personal information (PII)",
        "Health information (PHI)",
        "Criminal justice data (CJIS)"
      ],
      "option_meta": {
        "Public data only": {
          "short": "Public data",
          "icon": "globe",
          "description": "Only data that is already public."
        },
        "De-identified data": {
          "short": "De-identified",
          "icon": "shield-check",
          "description": "Personal identifiers removed before use."
        },
        "Internal, non-public data": {
          "short": "Internal data",
          "icon": "lock",
          "description": "Non-public operational data without personal identifiers."
        },
        "Personal information (PII)": {
          "short": "PII",
          "icon": "shield",
          "tone": "warn",
          "description": "Names, addresses, IDs or other personal identifiers."
        },
        "Health information (PHI)": {
          "short": "PHI",
          "icon": "shield",
          "tone": "warn",
          "description": "Identifiable health information covered by HIPAA."
        },
        "Criminal justice data (CJIS)": {
          "short": "CJIS",
          "icon": "shield",
          "tone": "warn",
          "description": "Data subject to CJIS security policy."
        }
      },
      "description": "Select all that apply. This helps others judge governance and approval effort."
    },
    {
      "key": "data_sources",
      "label": "Data sources",
      "prompt": "Which data sources does it use?",
      "type": "list",
      "group": "data",
      "weight": 2,
      "section": "details",
      "search": true,
      "icon": "database",
      "placeholder": "Immunization registry, 311 call transcripts, ESSENCE",
      "description": "Comma-separated. What data does the solution use? Describe — do not paste — sensitive data."
    },
    {
      "key": "audience",
      "label": "Who sees the output",
      "prompt": "Who sees the output?",
      "type": "select",
      "required": true,
      "group": "data",
      "weight": 3,
      "facet": true,
      "card": "icon",
      "icon": "users",
      "options": [
        "Public-facing",
        "Internal staff",
        "Partner organizations"
      ],
      "option_meta": {
        "Public-facing": {
          "short": "Public",
          "icon": "globe",
          "description": "Residents or the general public interact with it."
        },
        "Internal staff": {
          "short": "Internal",
          "icon": "lock",
          "description": "Used only inside the organization."
        },
        "Partner organizations": {
          "short": "Partners",
          "icon": "users",
          "description": "Shared with specific partner organizations."
        }
      }
    },
    {
      "key": "contact_name",
      "label": "Contact name",
      "prompt": "Who can people contact?",
      "type": "text",
      "required": true,
      "group": "contact",
      "weight": 1,
      "section": "contact",
      "placeholder": "Jordan Lee",
      "description": "Person others can reach out to with questions."
    },
    {
      "key": "contact_email",
      "label": "Contact email",
      "prompt": "What is their email?",
      "type": "email",
      "required": true,
      "group": "contact",
      "weight": 2,
      "section": "contact",
      "placeholder": "jordan.lee@city.gov"
    },
    {
      "key": "body",
      "label": "Full write-up",
      "prompt": "Tell the full story",
      "type": "markdown",
      "required": true,
      "group": "story",
      "weight": 1,
      "description": "Markdown is supported. Suggested headings: Problem, Approach, What it took (data, staffing, cost), Results, Lessons learned, How to reuse.",
      "placeholder": "## Problem\n\n## Approach\n\n## What it took\n\n## Results\n\n## Lessons learned\n\n## How to reuse this\n"
    }
  ]
};

/** Parsed _data/navigation.yml. */
export const NAVIGATION = [
  {
    "label": "Home",
    "url": "/"
  },
  {
    "label": "Catalog",
    "url": "/catalog/",
    "module": "catalog"
  },
  {
    "label": "Events",
    "url": "/events/",
    "module": "events"
  },
  {
    "label": "Cohorts",
    "url": "/cohorts/",
    "module": "cohorts"
  },
  {
    "label": "Resources",
    "url": "/resources/",
    "module": "resources"
  },
  {
    "label": "About",
    "url": "/about/"
  },
  {
    "label": "Submit",
    "url": "/submit/",
    "module": "submit",
    "style": "button"
  }
];

/** Verbatim _config.yml; the wizard patches title/description/url/baseurl into it. */
export const JEKYLL_CONFIG = "# Jekyll configuration.\n# Most site-specific settings live in _data/site.yml (branding, modules, labels),\n# _data/theme.yml (colors, fonts) and _data/schema.yml (the entry content model).\n# Keep this file to build mechanics. `title`/`description` here are fallbacks for\n# SEO tags; the setup wizard keeps them in sync with _data/site.yml.\n\ntitle: \"AI Use Case Catalog\"\ndescription: \"A shared catalog of AI use cases, tools, and lessons learned from Big Cities Health Coalition member health departments.\"\nurl: \"\"\nbaseurl: \"\"\ntheme: null\ntimezone: \"America/Chicago\"\nmarkdown: kramdown\npermalink: pretty\nfuture: false\n\nexclude:\n  - node_modules\n  - vendor\n  - README.md\n  - ARCHITECTURE.md\n  - CONTRIBUTING.md\n  - CHANGELOG.md\n  - SECURITY.md\n  - CLAUDE.md\n  - AGENTS.md\n  - LICENSE\n  - package-lock.json\n  - package.json\n  - tailwind.config.js\n  - postcss.config.js\n  - assets/css/tailwind.css\n  - scripts\n  - test\n  - docs\n  - Gemfile\n  - Gemfile.lock\n  - .ruby-version\n\ndefaults:\n  - scope:\n      path: \"catalog\"\n    values:\n      layout: entry\n  - scope:\n      path: \"cohorts\"\n    values:\n      layout: cohort\n\nplugins:\n  - jekyll-feed\n  - jekyll-seo-tag\n  - jekyll-sitemap\n  - jekyll-include-cache\n\nsass:\n  style: compressed\n";

/** The build-mechanics values _config.yml ships with. */
export const JEKYLL_DEFAULTS = {
  "title": "AI Use Case Catalog",
  "description": "A shared catalog of AI use cases, tools, and lessons learned from Big Cities Health Coalition member health departments.",
  "url": "",
  "baseurl": "",
  "timezone": "America/Chicago"
};

/** Icon names available to `icon` hints, read from _includes/icon.html. */
export const ICON_NAMES = [
  "academic-cap",
  "adjustments",
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "bolt",
  "book-open",
  "building",
  "calendar",
  "chart-bar",
  "chat",
  "check",
  "check-circle",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "clock",
  "close",
  "cloud",
  "code",
  "copy",
  "cpu",
  "credit-card",
  "database",
  "document",
  "download",
  "edit",
  "expand",
  "external-link",
  "eye",
  "eye-off",
  "filter",
  "flag",
  "globe",
  "grid",
  "home",
  "image",
  "info",
  "language",
  "layers",
  "link",
  "list",
  "location-pin",
  "lock",
  "mail",
  "menu",
  "microphone",
  "minus",
  "plus",
  "presentation",
  "rocket",
  "search",
  "server",
  "share",
  "shield",
  "shield-check",
  "sparkles",
  "star",
  "tag",
  "terminal",
  "trending-down",
  "trending-up",
  "user",
  "users",
  "wand",
  "warning",
  "wrench",
  "zoom-in"
];
