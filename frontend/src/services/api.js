/**
 * PULSE API Service
 * Handles communication with the FastAPI backend with seamless, automatic
 * client-side fallback (using bundled dataset and local engine) when deployed on
 * static hosts like Vercel, Netlify, or GitHub Pages.
 */

import { 
  getLocalStats, 
  getLocalReports, 
  getLocalReport, 
  preprocessTextLocal, 
  analyzeLocalEngine 
} from './localEngine';

const API_BASE = '/api';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend not responding");
    return await res.json();
  } catch (err) {
    // Return healthy client-side engine response on Vercel
    const stats = getLocalStats();
    return {
      status: "healthy (Cloud Client Engine)",
      system: "PULSE (Patient Update & Log Structuring Engine)",
      version: "1.0.0-prototype",
      dataset_loaded: true,
      total_reports: stats.total_reports,
      model_status: {
        current_engine: "Hybrid Clinical Information Extraction Pipeline",
        candidate_backbone: "Bio_ClinicalBERT",
        candidate_status: "Planned for experimental fine-tuning evaluation"
      },
      disclaimer: "PULSE is an AI-assisted clinical information-organization prototype. It does not diagnose, prescribe treatment, or replace professional clinical judgment."
    };
  }
}

export async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend stats offline");
    return await res.json();
  } catch (err) {
    // Cloud / Vercel fallback: load dynamic statistics computed from the 101 reports
    return getLocalStats();
  }
}

export async function fetchReports() {
  try {
    const res = await fetch(`${API_BASE}/reports`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend reports offline");
    return await res.json();
  } catch (err) {
    // Cloud / Vercel fallback: return all 101 reports from bundled dataset
    return getLocalReports();
  }
}

export async function fetchReport(reportId) {
  try {
    const res = await fetch(`${API_BASE}/reports/${reportId}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend report fetch offline");
    return await res.json();
  } catch (err) {
    // Cloud / Vercel fallback: return exact report by ID
    return getLocalReport(reportId);
  }
}

export async function preprocessText(rawText) {
  try {
    const res = await fetch(`${API_BASE}/preprocess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText }),
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) throw new Error("Backend preprocessor offline");
    return await res.json();
  } catch (err) {
    return preprocessTextLocal(rawText);
  }
}

export async function analyzeHandover({ reportId, rawText }) {
  try {
    const payload = {};
    if (reportId !== undefined && reportId !== null && reportId !== '') {
      payload.report_id = String(reportId);
    }
    if (rawText !== undefined && rawText !== null) {
      payload.raw_text = rawText;
    }

    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error("Backend analyzer offline");
    return await res.json();
  } catch (err) {
    // Cloud / Vercel fallback: execute complete clinical analysis pipeline client-side
    return analyzeLocalEngine({ reportId, rawText });
  }
}

export async function fetchHistory() {
  try {
    const res = await fetch(`${API_BASE}/history`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("Backend history offline");
    return await res.json();
  } catch (err) {
    return { history: [] };
  }
}
