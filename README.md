# AccessGuard — Autonomous Accessibility Compliance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![AI: Gemini Flash](https://img.shields.io/badge/AI-Gemini%20Flash-orange.svg)]()
[![WCAG: 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-brightgreen.svg)]()

---

## Overview

**AccessGuard** is a continuous accessibility compliance engine for enterprise web applications. It autonomously crawls target portals, generates precise WCAG 2.2 test cases using AI, runs automated validations, and delivers code-level remediation with human-in-the-loop review.

---

## Key Features

- **Automated DOM Crawling** — Scans page hierarchies, extracting images, buttons, headings, form controls, and structural tags.
- **AI-Powered Test Generation** — Uses Gemini AI to create specific, reproducible WCAG 2.2 test cases.
- **Automated Compliance Testing** — Maps test cases into automated validation workflows.
- **Intelligent Remediation** — Generates code-level fixes (HTML/JSX patches) with side-by-side comparison.
- **Human-in-the-Loop Review** — Queues remediation fixes for expert sign-off before applying changes.
- **Compliance Reporting** — Exports downloadable, print-ready HTML audit reports.

---

## Setup Instructions

### Environment Variables

Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
APP_URL="http://localhost:3000"
```

### Running Locally

```bash
# Install dependencies
npm install

# Start the development server (Express + React/Vite on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React + Vite | Frontend UI |
| Express + Node.js | Backend API server |
| Gemini AI (Flash) | WCAG test generation & remediation |
| Tailwind CSS | Styling |
| Framer Motion | Animations |

---

## License

MIT License. Copyright &copy; 2026 AccessGuard. All rights reserved.
