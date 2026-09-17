import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Activity, 
  Pill, 
  Stethoscope, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Database,
  Search,
  ExternalLink
} from 'lucide-react';
import { fetchHistory } from '../services/api';

export function ExtractionResultsPage({ latestResult, onNavigate, onSelectReport }) {
  const [historyRuns, setHistoryRuns] = useState([]);
  const [activeResult, setActiveResult] = useState(latestResult);
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    async function loadHist() {
      try {
        const data = await fetchHistory();
        setHistoryRuns(data.history || []);
        if (!latestResult && data.history && data.history.length > 0) {
          setActiveResult(data.history[0].structured_output);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    }
    loadHist();
  }, [latestResult]);

  return (
    <div className="extraction-results-container">
      {/* Header */}
      <div className="pulse-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">
              <Activity size={20} color="#06b6d4" /> Clinical Extraction Results & Evidence Attribution
            </h2>
            <p className="card-subtitle">
              Detailed inspection of extracted entities, clinical actions, and verbatim evidence citations
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {historyRuns.length > 0 && (
              <select 
                className="pulse-select"
                onChange={(e) => {
                  const run = historyRuns.find(h => h.id === parseInt(e.target.value));
                  if (run && run.structured_output) setActiveResult(run.structured_output);
                }}
              >
                <option value="">Switch Analysis Run ({historyRuns.length} stored)</option>
                {historyRuns.map(h => (
                  <option key={h.id} value={h.id}>
                    Run #{h.id} - Report {h.report_id} ({new Date(h.timestamp).toLocaleTimeString()})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {!activeResult ? (
        <div className="pulse-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Activity size={40} color="#6366f1" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>No Analysis Run Available</h3>
          <p style={{ color: '#94a3b8', margin: '0.5rem 0 1.5rem', maxWidth: '500px', marginInline: 'auto' }}>
            Execute an analysis on any report in the "Analyze Handover" page to view the detailed extraction results and evidence citations here.
          </p>
          <button className="btn-primary" onClick={() => onNavigate('analyze')}>
            Go to Analyze Handover
          </button>
        </div>
      ) : (
        <div>
          {/* Metadata Banner */}
          <div className="pulse-card" style={{ marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="chip" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: '#06b6d4', color: '#67e8f9', fontWeight: 700, marginRight: '0.5rem' }}>
                  Report #{activeResult.report_id}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  {activeResult.word_count} words | {activeResult.char_count} characters
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem' }}>
                <span className="chip">
                  Pipeline: {activeResult.model_metadata?.pipeline || 'PULSE Hybrid'}
                </span>
                <span className="chip" style={{ color: '#a5b4fc' }}>
                  Target Backbone: Bio_ClinicalBERT
                </span>
              </div>
            </div>
          </div>

          {/* Categorized Visual Cards with Evidence under each item */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Conditions Card */}
            <div className="pulse-card">
              <h3 className="card-title" style={{ color: 'var(--cat-condition-border)', marginBottom: '1rem' }}>
                Medical Conditions ({activeResult.entities?.conditions?.length || 0})
              </h3>
              {activeResult.entities?.conditions?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeResult.entities.conditions.map((c, i) => (
                    <div key={i} style={{ background: 'var(--cat-condition-bg)', border: '1px solid var(--cat-condition-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--cat-condition-text)' }}>{c.normalized}</div>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>Extracted span: "{c.text}"</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.3rem' }}>
                        Evidence: "{c.source_sentence}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not identified in this report.</p>
              )}
            </div>

            {/* Symptoms Card */}
            <div className="pulse-card">
              <h3 className="card-title" style={{ color: 'var(--cat-symptom-border)', marginBottom: '1rem' }}>
                Reported Symptoms ({activeResult.entities?.symptoms?.length || 0})
              </h3>
              {activeResult.entities?.symptoms?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeResult.entities.symptoms.map((s, i) => (
                    <div key={i} style={{ background: 'var(--cat-symptom-bg)', border: '1px solid var(--cat-symptom-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--cat-symptom-text)' }}>{s.normalized}</div>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>Extracted span: "{s.text}"</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.3rem' }}>
                        Evidence: "{s.source_sentence}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not identified in this report.</p>
              )}
            </div>

            {/* Medications Card */}
            <div className="pulse-card">
              <h3 className="card-title" style={{ color: 'var(--cat-medication-border)', marginBottom: '1rem' }}>
                Medications & Administration ({activeResult.entities?.medications?.length || 0})
              </h3>
              {activeResult.entities?.medications?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeResult.entities.medications.map((m, i) => (
                    <div key={i} style={{ background: 'var(--cat-medication-bg)', border: '1px solid var(--cat-medication-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--cat-medication-text)' }}>{m.normalized}</div>
                      <div style={{ fontSize: '0.75rem', color: '#f1f5f9', marginTop: '0.2rem' }}>
                        Dose: <strong>{m.dosage}</strong> | Route: <strong>{m.route}</strong> | Freq: <strong>{m.frequency}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.3rem' }}>
                        Evidence: "{m.source_sentence}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not identified in this report.</p>
              )}
            </div>

            {/* Investigations Card */}
            <div className="pulse-card">
              <h3 className="card-title" style={{ color: 'var(--cat-investigation-border)', marginBottom: '1rem' }}>
                Diagnostic Investigations ({activeResult.entities?.investigations?.length || 0})
              </h3>
              {activeResult.entities?.investigations?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeResult.entities.investigations.map((inv, i) => (
                    <div key={i} style={{ background: 'var(--cat-investigation-bg)', border: '1px solid var(--cat-investigation-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--cat-investigation-text)' }}>{inv.normalized}</div>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>Extracted span: "{inv.text}"</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.3rem' }}>
                        Evidence: "{inv.source_sentence}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not identified in this report.</p>
              )}
            </div>

            {/* Measurements Card */}
            <div className="pulse-card">
              <h3 className="card-title" style={{ color: 'var(--cat-measurement-border)', marginBottom: '1rem' }}>
                Vital Signs & Measurements ({activeResult.entities?.measurements?.length || 0})
              </h3>
              {activeResult.entities?.measurements?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeResult.entities.measurements.map((ms, i) => (
                    <div key={i} style={{ background: 'var(--cat-measurement-bg)', border: '1px solid var(--cat-measurement-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--cat-measurement-text)' }}>{ms.type}</div>
                      <div style={{ fontSize: '0.85rem', color: '#ffffff', marginTop: '0.2rem' }}>{ms.text}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.3rem' }}>
                        Evidence: "{ms.source_sentence}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not identified in this report.</p>
              )}
            </div>

            {/* Pending Tasks Card */}
            <div className="pulse-card">
              <h3 className="card-title" style={{ color: '#f43f5e', marginBottom: '1rem' }}>
                Pending Tasks ({activeResult.pending_tasks?.length || 0})
              </h3>
              {activeResult.pending_tasks?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeResult.pending_tasks.map((pt, i) => (
                    <div key={i} style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#fda4af' }}>{pt.task}</span>
                        <span className="chip chip-priority-high" style={{ fontSize: '0.65rem' }}>{pt.priority}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.3rem' }}>
                        Evidence: "{pt.source_sentence}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Not identified in this report.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
