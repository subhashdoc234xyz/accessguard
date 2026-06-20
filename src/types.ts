/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JobStatus =
  | "idle"
  | "crawling"
  | "generating_tests"
  | "executing"
  | "remediating"
  | "awaiting_approval"
  | "complete"
  | "failed";

export type Severity = "critical" | "serious" | "moderate" | "minor";

export interface PageCrawled {
  url: string;
  title: string;
  headings: Array<{ tag: string; text: string }>;
  images: Array<{ src: string; alt: string; hasAlt: boolean }>;
  buttonsAndLinks: Array<{ tag: "button" | "a"; text: string; ariaLabel: string; role: string }>;
  inputs: Array<{ type: string; placeholder: string; ariaDescribedBy: string; label: string }>;
  violationCount: number;
}

export interface TestCase {
  test_id: string;
  wcag_criterion: string;
  wcag_level: string;
  principle: string;
  element: string;
  description: string;
  expected: string;
  actual: string;
  severity: Severity;
  remediation: string;
  code_fix: string;
}

export interface RemediationPlan {
  test_id: string;
  code_fix: string;
  explanation: string;
  file_type: string;
  fix_time_minutes: number;
  priority: number;
  approved?: boolean;
}

export interface ScanResult {
  job_id: string;
  url: string;
  status: JobStatus;
  pages_crawled: number;
  total_elements_analyzed: number;
  violations_found: number;
  wcag_score: number;
  compliance_status: "AA Compliant" | "Partial" | "Non-Compliant";
  created_at: string;
  completed_at?: string;
  pages: PageCrawled[];
  test_cases: TestCase[];
  remediation_plans: RemediationPlan[];
  error?: string;
}
