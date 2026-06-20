/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Globe,
  Cpu,
  Shield,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Terminal,
  ExternalLink,
  Check,
  Zap,
  RotateCcw,
  UserCheck
} from "lucide-react";
import { ScanResult, TestCase } from "./types";
import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/LoginPage";
import RegisterForm from "./components/auth/RegisterForm";
import ForgotPassword from "./components/auth/ForgotPassword";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import UserMenu from "./components/UserMenu";

function MainApp() {
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
        if (err.name === "AbortError" || err.name === "SecurityError") return;
      }
    }

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

    const statusLabel = wcag_score >= 90 ? "complies with" : wcag_score >= 70 ? "partially complies with" : "does not comply with";
    const conclusion = `AccessGuard scanned ${url} on ${new Date(created_at).toLocaleString()}. The site ${statusLabel} WCAG 2.2 standards with a score of ${wcag_score}/100 (${compliance_status}), identifying ${violations_found} violations across ${pages_crawled} crawled pages.`;

    return `# AccessGuard Accessibility Audit Report\n\n## Website Scanned\n${url}\n\n## Scan Date\n${new Date(created_at).toLocaleString()}\n\n## WCAG Compliance Score\n**${wcag_score}/100** — ${compliance_status}\n\n## Summary\n| Metric | Count |\n|--------|-------|\n| Pages Crawled | ${pages_crawled} |\n| Elements Audited | ${total_elements_analyzed} |\n| Total Violations | ${violations_found} |\n| Critical | ${critical.length} |\n| Serious | ${serious.length} |\n| Moderate | ${moderate.length} |\n| Minor | ${minor.length} |\n\n## Detected Violations\n\n### Critical Violations\n${severityTable(critical)}\n### Serious Violations\n${severityTable(serious)}\n### Moderate Violations\n${severityTable(moderate)}\n### Minor Violations\n${severityTable(minor)}\n## AI Remediation Suggestions\n${remediationSection}\n## Conclusion\n${conclusion}\n\n---\n*Generated by AccessGuard — Powered by Gemini 2.5 Flash + UiPath Test Cloud*\n`;
  };

  const downloadMDReport = async () => {
    if (!jobState) return;
    const md = generateMarkdownReport();
    const hostname = getHostname(jobState.url);
    await saveFileViaPicker(md, `AccessGuard_Report_${hostname}.md`, "text/markdown");
  };

  const handleApproveFixes = async () => {
    if (!currentJobId) return;
    setLoading(true);

    try {
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

  const toggleRemediationApproval = (testId: string) => {
    setApprovedPlans((prev) => ({
      ...prev,
      [testId]: !prev[testId],
    }));
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return <span className="badge-critical px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">CRITICAL</span>;
      case "serious":
        return <span className="badge-serious px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">SERIOUS</span>;
      case "moderate":
        return <span className="badge-moderate px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">MODERATE</span>;
      default:
        return <span className="badge-minor px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">MINOR</span>;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Animated Floating Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Primary Navigation Shell */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer animate-fade-in" onClick={() => setView("home")}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center glow-blue transition-all duration-300 hover:scale-105">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-[#1e40af] text-lg block">AccessGuard</span>
              <span className="text-[10px] font-mono tracking-wider text-[#64748b] uppercase">Accessibility Compliance Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="badge-operational flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Systems Operational
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* VIEW 1: LANDING PAGE */}
        {view === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-16"
          >
            {/* Hero Launch Area */}
            <div className="text-center max-w-4xl mx-auto space-y-6 animate-fade-in-up">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border-blue-500/20 text-blue-600 text-xs font-semibold mb-3">
                <Zap className="w-3.5 h-3.5" />
                AI-Powered WCAG 2.2 Compliance Engine
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1e293b] leading-tight">
                Autonomous Accessibility Assurance for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 font-extrabold">Enterprise Web Apps</span>
              </h1>
              <p className="text-base text-[#64748b] max-w-2xl mx-auto leading-relaxed">
                AccessGuard is a continuous agentic compliance engine. It crawls enterprise apps, uses Gemini 2.5 Flash to generate WCAG 2.2 test cases, triggers UiPath Test Cloud audits, and publishes remediation fixes with human-in-the-loop review.
              </p>

              {/* Error Callout */}
              {errorText && (
                <div className="p-4 glass border-red-500/30 rounded-xl max-w-xl mx-auto text-red-600 text-sm flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {/* URL Scanner Form Input */}
              <div className="glass p-2.5 rounded-2xl max-w-2xl mx-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="glass-input flex-grow flex items-center gap-3 px-4">
                    <Globe className="w-5 h-5 text-[#94a3b8]" />
                    <input
                      type="text"
                      placeholder="Enter target enterprise app URL (e.g., https://my-erp.acme.com)..."
                      className="bg-transparent border-none outline-none py-3.5 text-[#1e293b] placeholder-[#94a3b8] text-sm w-full"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleStartScan(urlInput)}
                    />
                  </div>
                  <button
                    onClick={() => handleStartScan(urlInput)}
                    disabled={loading || !urlInput}
                    className="btn-primary px-5 py-3.5 text-sm tracking-wide flex items-center justify-center gap-2 flex-shrink-0"
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
            className="max-w-4xl mx-auto space-y-12 animate-fade-in"
          >
            {/* Top scanning card */}
            <div className="text-center space-y-4 animate-fade-in-up">
              <h1 className="text-3xl font-bold tracking-tight text-[#1e293b] flex items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                Assembling Compliance Agents
              </h1>
              <p className="text-[#64748b] text-sm max-w-lg mx-auto leading-relaxed">
                Coordinating autonomous modules to perform full accessibility checks on{" "}
                <span className="text-blue-600 font-mono text-xs bg-white/60 border border-blue-200/60 px-2 py-1 rounded">{jobState?.url}</span>
              </p>
            </div>

            {/* Pipeline Stage Tracks */}
            <div className="glass p-8 space-y-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-cyan-400 rounded-r" />

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

                  let statusIcon = <div className="w-6 h-6 rounded-full border border-slate-200 bg-white/60 flex-shrink-0" />;
                  let textStyle = "text-[#64748b]";
                  let descStyle = "text-[#64748b]";

                  if (elementIndex < currentIndex) {
                    statusIcon = (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    );
                    textStyle = "text-[#475569]";
                    descStyle = "text-[#64748b]";
                  } else if (elementIndex === currentIndex) {
                    statusIcon = (
                      <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-300 text-blue-600 flex items-center justify-center flex-shrink-0 animate-pulse shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    );
                    textStyle = "text-[#1e293b] font-semibold";
                    descStyle = "text-[#475569]";
                  } else {
                    statusIcon = (
                      <div className="w-6 h-6 rounded-full border border-slate-200 bg-white/60 flex items-center justify-center flex-shrink-0 text-[#94a3b8] font-mono text-[10px] font-bold">
                        {index + 1}
                      </div>
                    );
                    textStyle = "text-[#64748b]";
                    descStyle = "text-[#64748b]";
                  }

                  return (
                    <div key={index} className="flex gap-4 items-start border-b border-slate-200/50 pb-5 last:border-0 last:pb-0">
                      {statusIcon}
                      <div className="space-y-1">
                        <h4 className={`text-sm ${textStyle}`}>{s.label}</h4>
                        <p className={`text-xs ${descStyle} leading-normal`}>{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent Live logs console */}
            <div className="terminal-pipeline p-5 animate-scale-in">
              <div className="terminal-dots">
                <span className="dot-red" />
                <span className="dot-yellow" />
                <span className="dot-green" />
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#30363d] mb-3 text-xs pt-1">
                <span className="font-mono text-[#e6edf3] flex items-center gap-1.5 font-bold">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  AGENTS PIPELINE MONITOR
                </span>
                <span className="font-mono text-[#8b949e]">JOB_ID: {jobState?.job_id}</span>
              </div>
              <div className="font-mono text-[11px] text-[#c9d1d9] space-y-2 h-44 overflow-y-auto ">
                <p className="text-[#8b949e]">[SYSTEM] AccessGuard environment initialized.</p>
                <p className="text-[#8b949e]">[SYSTEM] API connection to cloud.uipath.com verified.</p>
                {jobState?.pages_crawled ? (
                  <>
                    <p className="text-emerald-400">[CRAWLER] Initiated fetch routine for target: {jobState.url}</p>
                    <p className="text-emerald-400">[CRAWLER] Scanned {jobState.pages_crawled} pages recursively.</p>
                  </>
                ) : null}
                {jobState?.status === "generating_tests" && (
                  <p className="text-[#58a6ff] animate-pulse">[GEMINI_AI] Processing HTML elements of indexed DOM. Aligning WCAG 2.2 standards...</p>
                )}
                {jobState?.status === "executing" && (
                  <>
                    <p className="text-[#f778ba]">[UIPATH_MGMT] Synchronized secure suite with UiPath Test Manager.</p>
                    <p className="text-[#f778ba] animate-pulse">[UIPATH_EXEC] Triggered automated client environment audits. Assessing contrast and ARIA labels...</p>
                  </>
                )}
                {jobState?.status === "remediating" && (
                  <p className="text-[#58a6ff] animate-pulse">[GEMINI_AI] Formulating correction patches. Aligning components & state properties...</p>
                )}
                <p className="text-[#8b949e]">[SYSTEM] Monitoring active state variables...</p>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 pb-6 animate-fade-in">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-blue-600 bg-blue-100/60 px-2.5 py-1 rounded border border-blue-200/60">
                  Compliance Audit Dashboard
                </span>
                <h1 className="text-2xl font-bold text-[#1e293b] mt-2 flex items-center gap-2">
                  {new URL(jobState.url).hostname}
                  <a href={jobState.url} target="_blank" rel="noopener noreferrer" className="text-[#94a3b8] hover:text-blue-600 transition">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </h1>
                <p className="text-xs text-[#64748b] mt-1">
                  Scanned on {new Date(jobState.created_at).toLocaleString()} | {jobState.pages_crawled} pages analyzed
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={downloadHTMLReport}
                  className="btn-html px-4 py-2.5 text-xs tracking-wide flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  ⬇ DOWNLOAD HTML REPORT
                </button>
                <button
                  onClick={downloadMDReport}
                  className="btn-secondary px-4 py-2.5 text-xs tracking-wide flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  ⬇ DOWNLOAD .md REPORT
                </button>
                <button
                  onClick={() => {
                    setView("home");
                    setUrlInput("");
                    setCurrentJobId(null);
                  }}
                  className="glass text-[#475569] hover:text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  AUDIT NEW DOMAIN
                </button>
              </div>
            </div>

            {/* Dashboard stats layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Score Chart Card */}
              <div className="glass p-6 flex flex-col items-center justify-center text-center relative overflow-hidden animate-scale-in">
                <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">WCAG Compliance index</span>

                {/* Donut SVG */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="score-track" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={
                        jobState.wcag_score >= 90
                          ? "score-fill-green score-glow-pulse"
                          : jobState.wcag_score >= 70
                          ? "score-fill-orange score-glow-pulse"
                          : "score-fill-red score-glow-pulse"
                      }
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - jobState.wcag_score / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-4xl font-extrabold text-[#1e293b]">{jobState.wcag_score}</span>
                    <span className="text-[10px] text-[#64748b] block font-semibold font-mono tracking-wider">/ 100</span>
                  </div>
                </div>

                <span
                  className="mt-6 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors"
                  style={{
                    backgroundColor: jobState.wcag_score >= 90 ? "rgba(16, 185, 129, 0.1)" : jobState.wcag_score >= 70 ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    color: jobState.wcag_score >= 90 ? "#059669" : jobState.wcag_score >= 70 ? "#d97706" : "#dc2626",
                    borderColor: jobState.wcag_score >= 90 ? "rgba(16, 185, 129, 0.25)" : jobState.wcag_score >= 70 ? "rgba(245, 158, 11, 0.25)" : "rgba(239, 68, 68, 0.25)",
                  }}
                >
                  {jobState.compliance_status}
                </span>
              </div>

              {/* Dynamic stats breakdown */}
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="stat-card animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                  <span className="text-[#64748b] text-xs font-bold uppercase tracking-wider">Crawled Pages</span>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-[#1e293b]">{jobState.pages_crawled}</div>
                    <div className="text-[10px] text-[#94a3b8] mt-1 font-mono uppercase tracking-wider">100% Index Success</div>
                  </div>
                </div>

                <div className="stat-card animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                  <span className="text-[#64748b] text-xs font-bold uppercase tracking-wider">Total DOM Nodes</span>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-[#1e293b]">{jobState.total_elements_analyzed}</div>
                    <div className="text-[10px] text-[#94a3b8] mt-1 font-mono uppercase tracking-wider">Elements Audited</div>
                  </div>
                </div>

                <div className="stat-card animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                  <span className="text-[#64748b] text-xs font-bold uppercase tracking-wider">Detector Highlights</span>
                  <div className="mt-4">
                    <div className="text-3xl font-extrabold text-red-600">{jobState.violations_found}</div>
                    <div className="text-[10px] text-[#94a3b8] mt-1 font-mono uppercase tracking-wider">WCAG Violations</div>
                  </div>
                </div>

                <div className="stat-card animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                  <span className="text-[#64748b] text-xs font-bold uppercase tracking-wider">UiPath Status</span>
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${jobState.status === "complete" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${jobState.status === "complete" ? "text-emerald-600" : "text-amber-600"}`}>
                        {jobState.status === "complete" ? "APPROVED" : "REVIEW"}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#94a3b8] mt-1 leading-tight">
                      {jobState.status === "complete" ? "Patches committed" : "Pending Maestro approval"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Tabs Segment */}
            <div className="border-b border-slate-200/60 flex gap-4 animate-fade-in">
              <button
                onClick={() => setActiveTab("violations")}
                className={`py-3 px-1.5 text-sm font-semibold tracking-tight border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === "violations"
                    ? "tab-active"
                    : "tab-inactive"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Detected WCAG Violations ({jobState.test_cases?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab("remediation")}
                className={`py-3 px-1.5 text-sm font-semibold tracking-tight border-b-2 transition flex items-center gap-2 cursor-pointer ${
                  activeTab === "remediation"
                    ? "tab-active"
                    : "tab-inactive"
                }`}
              >
                <Cpu className="w-4 h-4 text-blue-500" />
                AI Remediation Studio
              </button>
            </div>

            {/* TAB CONTENT: DETECTED VIOLATIONS */}
            {activeTab === "violations" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                <div className="lg:col-span-12 space-y-4">
                  <div className="glass rounded-2xl overflow-hidden">
                    <div className="p-5 bg-slate-50/50 border-b border-slate-200/50 font-bold tracking-tight text-[#1e293b] flex justify-between items-center text-sm">
                      <span>Violations Register</span>
                      <span className="text-xs font-mono font-medium text-[#64748b] uppercase">Interactive Remediation Queue</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="glass-table">
                        <thead>
                          <tr>
                            <th>Standard</th>
                            <th>Severity</th>
                            <th>Target Defect Element</th>
                            <th>Compliance Description</th>
                            <th>Remediation Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobState.test_cases?.map((tc, index) => (
                            <tr
                              key={index}
                              onClick={() => {
                                setSelectedTestCase(tc);
                                setActiveTab("remediation");
                              }}
                              className="cursor-pointer group"
                            >
                              <td>
                                <span className="block font-bold text-[#1e293b] group-hover:text-blue-600 transition-colors">
                                  WCAG {tc.wcag_criterion} ({tc.wcag_level})
                                </span>
                                <span className="text-[10px] text-[#64748b] font-mono italic block">{tc.principle}</span>
                              </td>
                              <td>{getSeverityBadge(tc.severity)}</td>
                              <td>
                                <code className="code-element max-w-[200px] inline-block truncate">
                                  {tc.element}
                                </code>
                              </td>
                              <td className="text-xs text-[#475569] max-w-sm truncate whitespace-normal leading-normal">
                                {tc.description}
                              </td>
                              <td className="text-xs">
                                <span className="text-blue-600 font-semibold group-hover:underline inline-flex items-center gap-1">
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
                <div className="lg:col-span-4 space-y-3">
                  <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider block mb-1">
                    Select Defect Reference
                  </span>
                  <div className="space-y-2 h-[480px] overflow-y-auto pr-1">
                    {jobState.test_cases?.map((tc) => {
                      const isSelected = selectedTestCase?.test_id === tc.test_id;
                      const isApproved = approvedPlans[tc.test_id];

                      return (
                        <div
                          key={tc.test_id}
                          onClick={() => setSelectedTestCase(tc)}
                          className={`p-4 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? "glass border-blue-500/50 shadow-lg shadow-blue-500/10"
                              : "glass-light hover:bg-white/60"
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2 mb-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#64748b]">{tc.test_id}</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              {isApproved ? (
                                <span className="text-[9px] text-emerald-600 bg-emerald-100 border border-emerald-300 rounded px-1.5 py-0.5 font-bold flex items-center gap-0.5 uppercase">
                                  <Check className="w-2.5 h-2.5" /> APPROVED
                                </span>
                              ) : (
                                <span className="text-[9px] text-[#64748b] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold uppercase">PENDING</span>
                              )}
                              <span>{getSeverityBadge(tc.severity)}</span>
                            </div>
                          </div>

                          <h4 className="text-sm font-semibold text-[#1e293b] leading-snug">
                            WCAG {tc.wcag_criterion} ({tc.wcag_level})
                          </h4>
                          <p className="text-xs text-[#64748b] line-clamp-2 mt-1 leading-normal">
                            {tc.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  {selectedTestCase ? (
                    <div className="glass p-6 space-y-6 animate-scale-in">
                      <div className="flex justify-between items-start border-b border-slate-200/60 pb-4">
                        <div>
                          <h3 className="text-base font-bold text-[#1e293b] flex items-center gap-2">
                            WCAG Criterion {selectedTestCase.wcag_criterion} — {selectedTestCase.principle}
                          </h3>
                          <p className="text-xs text-[#64748b] mt-1 flex items-center gap-1">
                            Severity Standard: <span className="badge-critical px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">{selectedTestCase.severity}</span>
                          </p>
                        </div>

                        <button
                          onClick={() => toggleRemediationApproval(selectedTestCase.test_id)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                            approvedPlans[selectedTestCase.test_id]
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : "glass text-[#475569] hover:text-[#1e293b]"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {approvedPlans[selectedTestCase.test_id] ? "Signed Off" : "Sign Off Remediation"}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider block">
                          Element Correction Studio
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-red-600 flex items-center gap-1.5 font-mono">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              Original Failure Code
                            </span>
                            <pre className="terminal-block p-4 text-[11px] font-mono whitespace-pre-wrap text-[#475569] h-44 overflow-y-auto">
                              {selectedTestCase.element}
                            </pre>
                          </div>

                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 font-mono">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Corrected Compliance Patch (Gemini Suggestion)
                            </span>
                            <pre className="terminal-block p-4 text-[11px] font-mono whitespace-pre-wrap text-emerald-700 h-44 overflow-y-auto">
                              {selectedTestCase.code_fix}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-4">
                        <h4 className="text-xs font-bold font-mono tracking-wider text-[#64748b] uppercase">
                          Compliance Remediation Guidance
                        </h4>
                        <p className="text-xs text-[#475569] leading-relaxed">
                          {selectedTestCase.remediation}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs border-t border-slate-200/50">
                          <div>
                            <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider block">Fix Time Estimate</span>
                            <span className="text-[#1e293b] font-bold font-mono">~10 min</span>
                          </div>
                          <div>
                            <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider block">WCAG Standard Pillar</span>
                            <span className="text-[#1e293b] font-bold font-mono">Standard Level {selectedTestCase.wcag_level}</span>
                          </div>
                          <div>
                            <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider block">File Destination</span>
                            <span className="text-[#1e293b] font-bold font-mono">React Component Stack</span>
                          </div>
                        </div>
                      </div>

                      {jobState.status !== "complete" && (
                        <div className="flex justify-end pt-4 border-t border-slate-200/60">
                          <button
                            onClick={handleApproveFixes}
                            className="btn-maestro px-5 py-3 text-xs font-semibold tracking-wide flex items-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" />
                            COMMIT SIGNOFFS TO MAESTRO
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-[#64748b] border border-slate-200/60 border-dashed rounded-2xl glass">
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
      <footer className="glass-footer py-12 text-center text-[#64748b] text-xs mt-16 max-w-full relative z-10">
        <p>&copy; 2026 AccessGuard. All rights reserved.</p>
        <p className="mt-1 font-mono text-[10px] text-[#94a3b8]">Autonomous WCAG 2.2 Compliance Engine — Powered by AI</p>
      </footer>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  // Show global loading spinner while auth state resolves
  if (loading) {
    return (
      <div
        className="min-h-screen font-sans flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #e8f4fd 0%, #dbeafe 50%, #ede9fe 100%)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center glow-blue">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Redirect authenticated users away from auth pages */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterForm />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />

      {/* Protected main app */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
