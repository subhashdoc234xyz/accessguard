# AccessGuard — Agentic Accessibility Testing System
### UiPath AgentHack 2026 | Track 3: Test Cloud | by Subhash Boopathi (Team Xeno)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.11](https://img.shields.io/badge/Python-3.11-brightgreen.svg)]()
[![Next.js: 14](https://img.shields.io/badge/Next.js-14-black.svg)]()
[![AI: Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange.svg)]()
[![UiPath: Test Cloud](https://img.shields.io/badge/UiPath-Test%20Cloud-red.svg)]()

---

## Business Problem
Enterprise web applications carry massive legal, financial, and moral liabilities for compliance failures under regional guidelines (such as ADA Title III, WCAG 2.2, European Accessibility Act, and the Indian Rights of Persons with Disabilities Act).

Traditional manual accessibility reviews are exceptionally slow, dry, expensive, and error-prone. They occur after releases are deployed, leading to severe visual debt, refactoring bottlenecks, and vulnerability. Modern engineering teams require an autonomous pipeline that continuous-checks interface components during release pipelines before deployments occur.

---

## Solution Overview
**AccessGuard** is a multi-agent testing system orchestrated by UiPath Test Cloud. It crawls target portals, creates precise WCAG 2.2 test cases using Gemini AI reasoning, runs standard validations in the Test Manager repository, and details code-level corrections with a built-in Human-In-The-Loop Maestro Review.

```
   [ USER INPUT ]
          │
          ▼
   ┌──────────────┐
   │ Agent 01     │ ───► Crawls webpage hierarchies, extracts images, buttons,
   │ Crawler      │      heading flows, form controls and raw structural tags.
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Agent 02     │ ───► Feeds target catalog details to Gemini 2.5 Flash to automatically
   │ Test Creator │      define specific, reproducible WCAG 2.2 criteria test cases.
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ UiPath       │ ───► Deploys dynamic test case assets to Test Cloud Manager to
   │ Test Cloud   │      verify form inputs and custom component attributes programmatically.
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Agent 03     │ ───► Invokes Gemini Generative parameters to automatically produce side-to-side
   │ Remediation  │      comprehensive JSX and HTML replacement code patches.
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ Automation   │ ───► Integrates with Action Center interfaces via Orchestrator API for
   │ Maestro HITL │      approval before commiting changes and exporting compliance certifications.
   └──────────────┘
```

---

## Setup Instructions

### Environment Credentials
Create a `.env` file in the root workspace folder:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
UIPATH_CLIENT_ID="your-uipath-app-id"
UIPATH_CLIENT_SECRET="your-uipath-secret"
```

### 1. Launching Local Host
Launch the full-stack system locally in development mode:
```bash
# Install package dependencies
npm install

# Run full-stack dev server (Express + React Vite on port 3000)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Coding Agent Usage (Gemini CLI — Bonus Points)
To optimize delivery and architecture speed, we leveraged **Gemini CLI** as our premier coding agent (for +2 bonus points). Gemini CLI assisted in scaffolding:
- **Crawler Pipelines**: Writing regular expression parsing tools for images, buttons, headings, and input tags.
- **Writers & Prompts**: Shaping highly robust system parameter arrays to ensure valid JSON responses from the `gemini-3.5-flash` model.
- **Reporting structures**: Designing beautiful downloadable print-ready offline HTML packages.
- **Interactive UIs**: Writing responsive motion/react animations and pipeline status components.

*See `/gemini-cli-logs/session-log.md` for our full session documentation.*

---

## Free Tools Utilized ($0 Cost)
| Service / Library | Purpose | Tier |
|---|---|---|
| Google AI Studio Code API | Generative WCAG interpretation & correction code recommendations | Gemini Flash Free Tier |
| UiPath Test Cloud | Automated Test Management | Community Orchestrator |
| Express & Node.js | Backend coordinate logic | $0 Open Source |
| Tailwind CSS | Visual CSS element layout | $0 Open Source |

---

## License
MIT License. Copyright &copy; 2026 Subhash Boopathi (Team Xeno).
All rights reserved.
