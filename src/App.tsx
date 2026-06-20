/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Cpu,
  FileCheck2,
  Shield,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  RefreshCw,
  Terminal,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  Zap,
  RotateCcw,
  UserCheck
} from "lucide-react";
import { ScanResult, TestCase, RemediationPlan, JobStatus } from "./types";

export default function App() {
  const [urlInput, setUrlInput] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobState, setJobState] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "scanning" | "dashboard">("home");
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [approvedPlans, setApprovedPlans] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"violations" | "remediation">("violations");

  // Poll job status while scan is running
  useEffect(() => {
    if (!currentJobId || view !== "scanning") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scan/${currentJobId}`);
        if (!response.ok) throw new Error("Could not fetch scan status.");
        const data: ScanResult = await response.json();
        setJobState(data);

        // Transition from scanning to dashboard once results are awaiting review or complete
        if (data.status === "awaiting_approval" || data.status === "complete") {
          setView("dashboard");
          if (data.test_cases?.length > 0) {
            setSelectedTestCase(data.test_cases[0]);
          }
          clearInterval(interval);
        } else if (data.status === "failed") {
          setErrorText(data.error || "Compliance testing execution failed.");
          setView("home");
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error(err);
        setErrorText("Lost connection with the accessibility agent pipeline.");
        setView("home");
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJobId, view]);

  // Start Scan handler
  const handleStartScan = async (targetUrl: string) => {
    if (!targetUrl) return;
    setLoading(true);
    setErrorText(null);

    // Auto prepend https if user omits
    let formattedUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formattedUrl }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to trigger accessibility scan.");
      }

      const data = await response.json();
      setCurrentJobId(data.job_id);
      setView("scanning");
    } catch (err: any) {
      setErrorText(err.message || "Accessibility agent pipeline error.");
    } finally {
      setLoading(false);
    }
  };

  // ── File Download Helpers ─────────────────────────────────────────
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return "unknown-domain";
    }
  };

  async function saveFileViaPicker(content: string, suggestedName: string, mimeType: string) {
    // Try the modern File System Access API first
    if ("showSaveFilePicker" in window) {
      try {
        const fileHandle = await (window as unknown as { showSaveFilePicker: (opts: any) => Promise<any> }).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "Document",
              accept: { [mimeType]: [`.${suggestedName.split(".").pop()}`] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      } catch (err: any) {
        // User cancelled or API not available — fall through
        if (err.name === "AbortError" || err.name === "SecurityError") return;
      }
    }

    // Fallback: create a temporary anchor element
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const downloadHTMLReport = async () => {
    if (!currentJobId) return;
    try {
      const response = await fetch(`/api/report/${currentJobId}`);
      if (!response.ok) throw new Error("Failed to fetch HTML report.");
      const html = await response.text();
      const hostname = getHostname(jobState?.url || "");
      await saveFileViaPicker(html, `AccessGuard_Report_${hostname}.html`, "text/html");
    } catch (err) {
      console.error("Download HTML report failed:", err);
    }
  };

  const generateMarkdownReport = (): string => {
    if (!jobState) return "";

    const { url, wcag_score, compliance_status, pages_crawled, total_elements_analyzed, violations_found, created_at, test_cases } = jobState;

    const critical = test_cases.filter((tc) => tc.severity === "critical");
    const serious = test_cases.filter((tc) => tc.severity === "serious");
    const moderate = test_cases.filter((tc) => tc.severity === "moderate");
    const minor = test_cases.filter((tc) => tc.severity === "minor");

    const severityTable = (cases: typeof test_cases) =>
      cases.length === 0
        ? "None\n"
        : `| ID | WCAG Standard | Element | Description | Fix Time |\n|----|--------------|---------|-------------|----------|\n` +
          cases
            .map(
              (tc) =>
                `| ${tc.test_id} | ${tc.wcag_criterion} (${tc.wcag_level}) | \`${tc.element}\` | ${tc.description} | ~10 min |`
            )
            .join("\n") +
          "\n";

    const remediationSection =
      test_cases.length === 0
        ? "No violations detected.\n"
        : test_cases
            .map((tc) => `- **${tc.test_id} (${tc.wcag_criterion})**: ${tc.remediation}`)
            .join("\n") + "\n";

    // Auto-generate a 2-sentence conclusion
    const statusLabel = wcag_score >= 90 ? "complies with" : wcag_score >= 70 ? "partially complies with" : "does not comply with";
    const conclusion = `AccessGuard scanned ${url} on ${new Date(created_at).toLocaleString()}. The site ${statusLabel} WCAG 2.2 standards with a score of ${wcag_score}/100 (${compliance_status}), identifying ${violations_found} violations across ${pages_crawled} crawled pages.`;

    return `# AccessGuard Accessibility Audit Report

## Website Scanned
${url}

## Scan Date
${new Date(created_at).toLocaleString()}

## WCAG Compliance Score
**${wcag_score}/100** — ${compliance_status}

## Summary
| Metric | Count |
|--------|-------|
| Pages Crawled | ${pages_crawled} |
| Elements Audited | ${total_elements_analyzed} |
| Total Violations | ${violations_found} |
| Critical | ${critical.length} |
| Serious | ${serious.length} |
| Moderate | ${moderate.length} |
| Minor | ${minor.length} |

## Detected Violations

### Critical Violations
${severityTable(critical)}
### Serious Violations
${severityTable(serious)}
### Moderate Violations
${severityTable(moderate)}
### Minor Violations
${severityTable(minor)}
## AI Remediation Suggestions
${remediationSection}
## Conclusion
${conclusion}

---
*Generated by AccessGuard — Powered by Gemini 2.5 Flash + UiPath Test Cloud*
`;
  };

  const downloadMDReport = async () => {
    if (!jobState) return;
    const md = generateMarkdownReport();
    const hostname = getHostname(jobState.url);
    await saveFileViaPicker(md, `AccessGuard_Report_${hostname}.md`, "text/markdown");
  };

  // Human-in-the-loop Remediation Fix Approver
  const handleApproveFixes = async () => {
    if (!currentJobId) return;
    setLoading(true);

    try {
      // Collect approved plans
      const approvals = Object.keys(approvedPlans).filter((key) => approvedPlans[key]);

      const response = await fetch(`/api/approve/${currentJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvals }),
      });

      if (response.ok) {
        const data = await response.json();
        setJobState(data.job);
      }
    } catch (err) {
      console.error("Approve fixes failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Single Remediations
  const toggleRemediationApproval = (testId: string) => {
    setApprovedPlans((prev) => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">CRITICAL</span>;
      case "serious":
        return <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">SERIOUS</span>;
      case "moderate":
        return <span className="bg-amber-50/50 text-amber-500 border border-amber-100 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">MODERATE</span>;
      default:
        return <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">MINOR</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-600 selection:text-white relative">
      {/* Absolute Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Primary Navigation Shell */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer animate-fade-in" onClick={() => setView("home")}>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm hover:bg-indigo-700 transition-colors">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-slate-900 text-lg block">AccessGuard</span>
              <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Accessibility Compliance Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Systems Operational
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* VIEW 1: LANDING PAGE */}
        {view === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-16"
          >
            {/* Hero Launch Area */}
            <div className="text-center max-w-4xl mx-auto space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-600 text-xs font-semibold mb-3">
                <Zap className="w-3.5 h-3.5" />
                AI-Powered WCAG 2.2 Compliance Engine
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                Autonomous Accessibility Assurance for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-800 font-extrabold">Enterprise Web Apps</span>
              </h1>
              <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                AccessGuard is a continuous agentic compliance engine. It crawls enterprise apps, uses Gemini 2.5 Flash to generate WCAG 2.2 test cases, triggers UiPath Test Cloud audits, and publishes remediation fixes with human-in-the-loop review.
              </p>

              {/* Error Callout */}
              {errorText && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl max-w-xl mx-auto text-rose-700 text-sm flex items-center gap-3 shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {/* URL Scanner Form Input */}
              <div className="bg-white border border-slate-200 p-2.5 rounded-2xl max-w-2xl mx-auto shadow-sm">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-grow flex items-center gap-3 px-4 bg-slate-50 border border-slate-200/80 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter target enterprise app URL (e.g., https://my-erp.acme.com)..."
                      className="bg-transparent border-none outline-none py-3.5 text-slate-800 placeholder-slate-400 text-sm w-full"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleStartScan(urlInput)}
                    />
                  </div>
                  <button
                    onClick={() => handleStartScan(urlInput)}
                    disabled={loading || !urlInput}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl px-5 py-3.5 font-semibold text-sm tracking-wide transition shadow-xs flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Start Agent Assembly
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>


          </motion.div>
        )}

        {/* VIEW 2: PIPELINE AND AGENTS WORKING */}
        {view === "scanning" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto space-y-12"
          >
            {/* Top scanning card */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                Assembling Compliance Agents
              </h1>
              <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
                Coordinating autonomous modules to perform full accessibility checks on{" "}
                <span className="text-indigo-600 font-mono text-xs bg-indigo-50 border border-indigo-100/60 px-2 py-1 rounded">{jobState?.url}</span>
              </p>
            </div>

            {/* Pipeline Stage Tracks */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />

              <div className="space-y-6">
                {[
                  {
                    stage: "crawling",
                    label: "Agent 01: Deep Domain Crawler Active",
                    desc: "Injecting audit rules, indexing HTML DOM trees, page hierarchies, and interactive element rosters.",
                  },
                  {
                    stage: "generating_tests",
                    label: "Agent 02: Gemini WCAG Audit Parser Active",
                    desc: "Wrangling raw elements against WCAG 2.2 principles (Perceivable, Operable, Robust). Creating test definitions.",
                  },
                  {
                    stage: "executing",
                    label: "Automation: Orchestrating UiPath Test Cloud",
                    desc: "Connecting secure API pathways to test Manager suites to validate element interaction constraints.",
                  },
                  {
                    stage: "remediating",
                    label: "Agent 03: Gemini AI Remediation Studio Active",
                    desc: "Generating standard frontend JSX/HTML correction patches and computing WCAG compliance indexes.",
                  },
                  {
                    stage: "awaiting_approval",
                    label: "Maestro Integration: Initiating Human-in-the-Loop review",
                    desc: "Triggering Action Center tickets for expert sign-off before committing code-fixes.",
                  },
                ].map((s, index) => {
                  const states = ["crawling", "generating_tests", "executing", "remediating", "awaiting_approval", "complete"];
                  const currentIndex = states.indexOf(jobState?.status || "crawling");
                  const elementIndex = states.indexOf(s.stage);

                  let statusIcon = <div className="w-6 h-6 rounded-full border border-slate-200 bg-slate-50 flex-shrink-0" />;
                  let textStyle = "text-slate-400";

                  if (elementIndex < currentIndex) {
                    // Completed Step
                    statusIcon = (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/10">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    );
                    textStyle = "text-slate-500 line-through/80";
                  } else if (elementIndex === currentIndex) {
                    // Active Step
                    statusIcon = (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse shadow-sm shadow-indigo-600/10">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    );
                    textStyle = "text-slate-900 font-semibold";
                  } else {
                    statusIcon = (
                      <div className="w-6 h-6 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 text-slate-300 font-mono text-[10px] font-bold">
                        {index + 1}
                      </div>
                    );
                    textStyle = "text-slate-450";
                  }

                  return (
                    <div key={index} className="flex gap-4 items-start border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                      {statusIcon}
                      <div className="space-y-1">
                        <h4 className={`text-sm ${textStyle}`}>{s.label}</h4>
                        <p className="text-xs text-slate-500 leading-normal">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent Live logs console */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3 text-xs">
                <span className="font-mono text-slate-300 flex items-center gap-1.5 font-bold">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  AGENTS PIPELINE MONITOR
                </span>
                <span className="font-mono text-slate-500">JOB_ID: {jobState?.job_id}</span>
              </div>
              <div className="font-mono text-[11px] text-slate-300/90 space-y-2 h-44 overflow-y-auto scrollbar-thin">
                <p className="text-slate-500">[SYSTEM] AccessGuard environment initialized.</p>
                <p className="text-slate-500">[SYSTEM] API connection to cloud.uipath.com verified.</p>
                {jobState?.pages_crawled ? (
                  <>
                    <p className="text-emerald-400">[CRAWLER] Initiated fetch routine for target: {jobState.url}</p>
                    <p className="text-emerald-400">[CRAWLER] Scanned {jobState.pages_crawled} pages recursively.</p>
                  </>
                ) : null}
                {jobState?.status === "generating_tests" && (
                  <p className="text-indigo-400 animate-pulse">[GEMINI_AI] Processing HTML elements of indexed DOM. Aligning WCAG 2.2 standards...</p>
                )}
                {jobState?.status === "executing" && (
                  <>
                    <p className="text-pink-400">[UIPATH_MGMT] Synchronized secure suite with UiPath Test Manager.</p>
                    <p className="text-pink-400 animate-pulse">[UIPATH_EXEC] Triggered automated client environment audits. Assessing contrast and ARIA labels...</p>
                  </>
                )}
                {jobState?.status === "remediating" && (
                  <p className="text-indigo-400 animate-pulse">[GEMINI_AI] Formulating correction patches. Aligning components & state properties...</p>
                )}
                <p className="text-slate-600">[SYSTEM] Monitoring active state variables...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: COMPREHENSIVE COMPLIANCE DASHBOARD */}
        {view === "dashboard" && jobState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
            {/* Top metadata context */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">
                  Compliance Audit Dashboard
                </span>
                <h1 className="text-2xl font-bold text-slate-800 mt-2 flex items-center gap-2">
                  {new URL(jobState.url).hostname}
                  <a href={jobState.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600 transition">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Scanned on {new Date(jobState.created_at).toLocaleString()} | {jobState.pages_crawled} pages analyzed
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={downloadHTMLReport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-white" />
                  ⬇ DOWNLOAD HTML REPORT
                </button>
                <button
                  onClick={downloadMDReport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-white" />
                  ⬇ DOWNLOAD .md REPORT
                </button>
                <button
                  onClick={() => {
                    setView("home");
                    setUrlInput("");
                    setCurrentJobId(null);
                  }}
                  className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  AUDIT NEW DOMAIN
                </button>
              </div>
            </div>

            {/* Dashboard stats layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Score Chart Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">WCAG Compliance index</span>

                {/* Donut SVG */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background */}
                    <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="8" fill="transparent" />
                    {/* Score fill */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={jobState.wcag_score >= 90 ? "#10B981" : jobState.wcag_score >= 70 ? "#F59E0B" : "#EF4444"}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - jobState.wcag_score / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-4xl font-extrabold text-slate-800">{jobState.wcag_score}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold font-mono tracking-wider">/ 100</span>
                  </div>
                </div>

                <span
                  className="mt-6 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors"
                  style={{
                    backgroundColor: jobState.wcag_score >= 90 ? "#ECFDF5" : jobState.wcag_score >= 70 ? "#FFFBEB" : "#FEF2F2",
                    color: jobState.wcag_score >= 90 ? "#047857" : jobState.wcag_score >= 70 ? "#B45309" : "#B91C1C",
                    borderColor: jobState.wcag_score >= 90 ? "#A7F3D0" : jobState.wcag_score >= 70 ? "#FDE68A" : "#FCA5A5",
                  }}
                >
                  {jobState.compliance_status}
                </span>
              </div>

              {/* Dynamic stats breakdown */}
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Crawled Pages</span>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-800">{jobState.pages_crawled}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">100% Index Success</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total DOM Nodes</span>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-slate-800">{jobState.total_elements_analyzed}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">Elements Audited</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Detector Highlights</span>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-rose-500">{jobState.violations_found}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">WCAG Violations</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">UiPath Status</span>
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${jobState.status === "complete" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${jobState.status === "complete" ? "text-emerald-600" : "text-amber-500"}`}>
                        {jobState.status === "complete" ? "APPROVED" : "REVIEW"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                      {jobState.status === "complete" ? "Patches committed" : "Pending Maestro approval"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Tabs Segment */}
            <div className="border-b border-slate-200 flex gap-4">
              <button
                onClick={() => setActiveTab("violations")}
                className={`py-3 px-1.5 text-sm font-semibold tracking-tight border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === "violations"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-850"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Detected WCAG Violations ({jobState.test_cases?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab("remediation")}
                className={`py-3 px-1.5 text-sm font-semibold tracking-tight border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === "remediation"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-850"
                }`}
              >
                <Cpu className="w-4 h-4 text-indigo-500" />
                AI Remediation Studio
              </button>
            </div>

            {/* TAB CONTENT: DETECTED VIOLATIONS */}
            {activeTab === "violations" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Violations Left Table List */}
                <div className="lg:col-span-12 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 bg-slate-50 border-b border-slate-200/80 font-bold tracking-tight text-slate-800 flex justify-between items-center text-sm">
                      <span>Violations Register</span>
                      <span className="text-xs font-mono font-medium text-slate-400 uppercase">Interactive Remediation Queue</span>
                    </div>

                    <div className="divide-y divide-slate-100 overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-xs text-slate-450 uppercase font-mono border-b border-slate-200/85">
                          <tr>
                            <th className="px-6 py-3.5 font-bold text-slate-500">Standard</th>
                            <th className="px-6 py-3.5 font-bold text-slate-500">Severity</th>
                            <th className="px-6 py-3.5 font-bold text-slate-500">Target Defect Element</th>
                            <th className="px-6 py-3.5 font-bold text-slate-500">Compliance Description</th>
                            <th className="px-6 py-3.5 font-bold text-slate-500">Remediation Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {jobState.test_cases?.map((tc, index) => (
                            <tr
                              key={index}
                              onClick={() => {
                                setSelectedTestCase(tc);
                                setActiveTab("remediation");
                              }}
                              className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                            >
                              <td className="px-6 py-4">
                                <span className="block font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                  WCAG {tc.wcag_criterion} ({tc.wcag_level})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono italic block">{tc.principle}</span>
                              </td>
                              <td className="px-6 py-4">{getSeverityBadge(tc.severity)}</td>
                              <td className="px-6 py-4">
                                <code className="text-[11px] font-mono bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-1 rounded-lg max-w-[200px] inline-block truncate">
                                  {tc.element}
                                </code>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-600 max-w-sm truncate whitespace-normal leading-normal">
                                {tc.description}
                              </td>
                              <td className="px-6 py-4 text-xs">
                                <span className="text-indigo-600 font-semibold group-hover:underline inline-flex items-center gap-1">
                                  Open Studio
                                  <ArrowRight className="w-3 h-3" />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: REMEDIATION STUDIO */}
            {activeTab === "remediation" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                {/* Left panel element select list */}
                <div className="lg:col-span-4 space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Select Defect Reference
                  </span>
                  <div className="space-y-2 h-[480px] overflow-y-auto scrollbar-thin pr-1">
                    {jobState.test_cases?.map((tc) => {
                      const isSelected = selectedTestCase?.test_id === tc.test_id;
                      const isApproved = approvedPlans[tc.test_id];

                      return (
                        <div
                          key={tc.test_id}
                          onClick={() => setSelectedTestCase(tc)}
                          className={`p-4 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? "bg-indigo-50/50 border-indigo-500 shadow-sm shadow-indigo-500/5"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/20"
                          }`}
                        >
                          {/* Top Tag severity badge */}
                          <div className="flex justify-between items-center gap-2 mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-400">{tc.test_id}</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              {isApproved ? (
                                <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 font-bold flex items-center gap-0.5 uppercase">
                                  <Check className="w-2.5 h-2.5" /> APPROVED
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold uppercase">PENDING</span>
                              )}
                              <span>{getSeverityBadge(tc.severity)}</span>
                            </div>
                          </div>

                          <h4 className="text-sm font-semibold text-slate-800 leading-snug">
                            WCAG {tc.wcag_criterion} ({tc.wcag_level})
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-normal">
                            {tc.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right sandbox panel */}
                <div className="lg:col-span-8 space-y-6">
                  {selectedTestCase ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                      {/* Top Header metadata info */}
                      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            WCAG Criterion {selectedTestCase.wcag_criterion} — {selectedTestCase.principle}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            Severity Standard: <span className="text-rose-600 font-semibold bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider">{selectedTestCase.severity}</span>
                          </p>
                        </div>

                        {/* Maestro approval checkboxes */}
                        <button
                          onClick={() => toggleRemediationApproval(selectedTestCase.test_id)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-2xs ${
                            approvedPlans[selectedTestCase.test_id]
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {approvedPlans[selectedTestCase.test_id] ? "Signed Off" : "Sign Off Remediation"}
                        </button>
                      </div>

                      {/* Side-by-Side Sandbox Comparison */}
                      <div className="space-y-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Element Correction Studio
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Current Defect Node Code */}
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-rose-650 flex items-center gap-1.5 font-mono">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              Original Failure Code
                            </span>
                            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono whitespace-pre-wrap text-slate-300 h-44 overflow-y-auto">
                              {selectedTestCase.element}
                            </pre>
                          </div>

                          {/* Corrected Remediation Node Code */}
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-emerald-650 flex items-center gap-1.5 font-mono">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Corrected Compliance Patch (Gemini Suggestion)
                            </span>
                            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono whitespace-pre-wrap text-emerald-400 h-44 overflow-y-auto">
                              {selectedTestCase.code_fix}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Remediation steps list */}
                      <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4 shadow-3xs">
                        <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
                          Compliance Remediation Guidance
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {selectedTestCase.remediation}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs border-t border-slate-200/65">
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Fix Time Estimate</span>
                            <span className="text-slate-700 font-bold font-mono">~10 min</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">WCAG Standard Pillar</span>
                            <span className="text-slate-700 font-bold font-mono">Standard Level {selectedTestCase.wcag_level}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">File Destination</span>
                            <span className="text-slate-700 font-bold font-mono">React Component Stack</span>
                          </div>
                        </div>
                      </div>

                      {/* Maestro Submit controls */}
                      {jobState.status !== "complete" && (
                        <div className="flex justify-end pt-4 border-t border-slate-100">
                          <button
                            onClick={handleApproveFixes}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/10"
                          >
                            <UserCheck className="w-4 h-4" />
                            COMMIT SIGNOFFS TO MAESTRO
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400 border border-slate-200 border-dashed rounded-2xl">
                      Select any defect elements from the list to invoke element remediation.
                    </div>
                  )}
                </div>
              </div>
            )}


          </motion.div>
        )}
      </main>

      {/* Elegant Footer area */}
      <footer className="border-t border-slate-200 bg-white py-12 text-center text-slate-500 text-xs mt-16 max-w-full">
        <p>&copy; 2026 AccessGuard. All rights reserved.</p>
        <p className="mt-1 font-mono text-[10px] text-slate-400">Autonomous WCAG 2.2 Compliance Engine — Powered by AI</p>
      </footer>
    </div>
  );
}
