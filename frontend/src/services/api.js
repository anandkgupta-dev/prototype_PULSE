/**
 * PULSE API Service
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`Failed to load dataset statistics: ${res.statusText}`);
  return res.json();
}

export async function fetchReports() {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error(`Failed to load reports: ${res.statusText}`);
  return res.json();
}

export async function fetchReport(reportId) {
  const res = await fetch(`${API_BASE}/reports/${reportId}`);
  if (!res.ok) throw new Error(`Failed to load report #${reportId}: ${res.statusText}`);
  return res.json();
}

export async function preprocessText(rawText) {
  const res = await fetch(`${API_BASE}/preprocess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText })
  });
  if (!res.ok) throw new Error(`Preprocessing failed: ${res.statusText}`);
  return res.json();
}

export async function analyzeHandover({ reportId, rawText }) {
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
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Analysis failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error(`Failed to load history: ${res.statusText}`);
  return res.json();
}
