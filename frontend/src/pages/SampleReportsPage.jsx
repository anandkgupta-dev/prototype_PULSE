import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  ArrowRight, 
  Activity, 
  ExternalLink, 
  X, 
  Check, 
  Layers,
  ShieldCheck,
  Info,
  FileSpreadsheet,
  SplitSquareVertical
} from 'lucide-react';
import { fetchReports, fetchReport } from '../services/api';

export function SampleReportsPage({ onSelectReport, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalReport, setActiveModalReport] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTab, setModalTab] = useState('comparison');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchReports();
        setReports(data.reports || []);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function openReportModal(reportId) {
    try {
      setModalLoading(true);
      const data = await fetchReport(reportId);
      setActiveModalReport(data);
    } catch (err) {
      console.error("Failed to load report detail:", err);
    } finally {
      setModalLoading(false);
    }
  }

  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.report_id.toString().includes(q) ||
      r.filename.toLowerCase().includes(q) ||
      (r.preview && r.preview.toLowerCase().includes(q))
    );
  });

  return (
    <div className="sample-reports-container">
      {/* Header */}
      <div className="pulse-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">
              <FileText size={20} color="#06b6d4" /> Sample Nursing Handover Reports (101 Documents)
            </h2>
            <p className="card-subtitle">
              Browse, search, and inspect the 101 synthetic nursing handovers from <code className="mono">data/101writtenfreetextreports/</code>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0a0f1d', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.8rem', minWidth: '280px' }}>
            <Search size={16} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search by ID (e.g. 0, 12) or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', outline: 'none', fontSize: '0.85rem', width: '100%' }}
            />
            {searchQuery && (
              <X size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
            )}
          </div>
        </div>
      </div>

      {/* Grid of Report Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#06b6d4' }}>
          Loading 101 handover reports...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filteredReports.map((report) => (
            <div 
              key={report.report_id} 
              className="pulse-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', background: 'rgba(17, 24, 39, 0.7)' }}
              onClick={() => openReportModal(report.report_id)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span className="chip" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.4)', color: '#a5b4fc', fontWeight: 700 }}>
                    Report #{report.report_id}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {report.word_count} words
                  </span>
                </div>

                <p style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1rem', fontStyle: 'italic' }}>
                  "{report.preview}"
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }} className="mono">
                  {report.filename}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                  Inspect & Analyze <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activeModalReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="pulse-card" style={{ maxWidth: '920px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#0a101f', border: '1px solid rgba(99, 102, 241, 0.5)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileSpreadsheet size={20} color="#6366f1" />
                  Report #{activeModalReport.report_id} ({activeModalReport.filename})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {activeModalReport.word_count} words | {activeModalReport.char_count} characters | Status: <strong style={{ color: '#34d399' }}>Verified Clinical Handover</strong>
                </span>
              </div>
              <button 
                onClick={() => setActiveModalReport(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Clinical NLP Explanation Callout */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <Info size={20} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                <strong style={{ color: '#818cf8' }}>Clinical Non-Destructive Preprocessing Standard: </strong>
                In healthcare NLP, raw and preprocessed text look similar by design! Unlike web NLP (which converts text to lowercase, strips numbers, and drops words), medical preprocessing <strong>must never</strong> destroy clinical acronyms (<span className="mono" style={{ color: '#a5b4fc' }}>GCS, BP, IV</span>), measurements (<span className="mono" style={{ color: '#a5b4fc' }}>120/80, 5mg</span>), or critical negations (<span className="mono" style={{ color: '#f87171' }}>"no plan for discharge"</span>). PULSE cleans concatenated punctuation, standardizes Unicode quotes/dashes, fixes spacing, and segments sentences without endangering clinical facts.
              </div>
            </div>

            {/* Modal Tab Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem' }}>
              <button 
                className={`btn-secondary ${modalTab === 'comparison' ? 'active-tab' : ''}`}
                style={{ 
                  fontSize: '0.78rem', 
                  padding: '0.4rem 0.85rem',
                  background: modalTab === 'comparison' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  borderColor: modalTab === 'comparison' ? '#6366f1' : 'var(--border-subtle)',
                  color: modalTab === 'comparison' ? '#a5b4fc' : '#94a3b8'
                }}
                onClick={() => setModalTab('comparison')}
              >
                Side-by-Side Comparison
              </button>
              <button 
                className={`btn-secondary ${modalTab === 'sentences' ? 'active-tab' : ''}`}
                style={{ 
                  fontSize: '0.78rem', 
                  padding: '0.4rem 0.85rem',
                  background: modalTab === 'sentences' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  borderColor: modalTab === 'sentences' ? '#06b6d4' : 'var(--border-subtle)',
                  color: modalTab === 'sentences' ? '#67e8f9' : '#94a3b8'
                }}
                onClick={() => setModalTab('sentences')}
              >
                <SplitSquareVertical size={13} style={{ display: 'inline', marginRight: '4px' }} />
                NLP Sentence Segmentation ({(activeModalReport.sentences || []).length})
              </button>
              <button 
                className={`btn-secondary ${modalTab === 'audit' ? 'active-tab' : ''}`}
                style={{ 
                  fontSize: '0.78rem', 
                  padding: '0.4rem 0.85rem',
                  background: modalTab === 'audit' ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                  borderColor: modalTab === 'audit' ? '#34d399' : 'var(--border-subtle)',
                  color: modalTab === 'audit' ? '#6ee7b7' : '#94a3b8'
                }}
                onClick={() => setModalTab('audit')}
              >
                <ShieldCheck size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Normalization Audit Log ({(activeModalReport.changes_made || []).length})
              </button>
            </div>

            {/* TAB 1: Comparison */}
            {modalTab === 'comparison' && (
              <>
                <div className="comparison-grid" style={{ marginBottom: '1.25rem' }}>
                  <div className="comparison-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="comparison-title" style={{ color: '#94a3b8' }}>RAW HANDOVER TEXT (ORIGINAL)</span>
                      <span className="chip" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>{activeModalReport.raw_text.length} chars</span>
                    </div>
                    <div className="comparison-content" style={{ fontSize: '0.85rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px' }}>
                      {activeModalReport.raw_text}
                    </div>
                  </div>

                  <div className="comparison-box" style={{ borderColor: 'rgba(99, 102, 241, 0.35)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="comparison-title" style={{ color: '#a5b4fc' }}>PREPROCESSED CLINICAL TEXT (NORMALIZED)</span>
                      <span className="chip" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#c7d2fe', fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                        {activeModalReport.preprocessed_text.length} chars
                      </span>
                    </div>
                    <div className="comparison-content" style={{ fontSize: '0.85rem', lineHeight: 1.5, background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                      {activeModalReport.preprocessed_text}
                    </div>
                  </div>
                </div>

                {/* Quick Audit Highlights */}
                <div style={{ background: '#0a0f1d', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Preprocessing Transformations Fired on this Document:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(activeModalReport.changes_made || []).map((ch, idx) => (
                      <span key={idx} className="chip" style={{ background: 'rgba(52, 211, 153, 0.1)', borderColor: 'rgba(52, 211, 153, 0.3)', color: '#6ee7b7', fontSize: '0.72rem' }}>
                        <Check size={11} style={{ marginRight: '3px' }} /> {ch}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Clinical Safety Non-Destructive Invariants Preserved:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {(activeModalReport.preserved_clinical_elements || [
                        "Preserved numerical dosages, vitals and clinical measurement units",
                        "Preserved clinical acronyms (GCS, BP, IV, COPD) without destructive lowercasing",
                        "Preserved negative assertion terms ('no', 'without') to prevent dangerous false-positive inferences"
                      ]).map((item, idx) => (
                        <span key={idx} className="chip" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', fontSize: '0.72rem' }}>
                          <ShieldCheck size={11} style={{ marginRight: '3px', color: '#818cf8' }} /> {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: NLP Sentence Segmentation */}
            {modalTab === 'sentences' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  PULSE segments unstructured clinical narratives into individual semantic sentences for accurate entity & temporal extraction:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {(activeModalReport.sentences || [activeModalReport.preprocessed_text]).map((sentence, idx) => (
                    <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '6px', padding: '0.65rem 0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <span className="chip" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                        S#{idx + 1}
                      </span>
                      <div style={{ fontSize: '0.85rem', color: '#f1f5f9', lineHeight: 1.4 }}>
                        {sentence}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Full Audit Log */}
            {modalTab === 'audit' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#a5b4fc', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Deterministic Clinical Cleaning & Transformation Pipeline Log
                  </h4>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {(activeModalReport.changes_made || []).map((ch, idx) => (
                      <li key={idx} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={14} color="#34d399" />
                        <span>{ch}</span>
                      </li>
                    ))}
                  </ul>

                  <h4 style={{ fontSize: '0.85rem', color: '#38bdf8', marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Mandatory Non-Destructive Clinical Invariants Preserved
                  </h4>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {(activeModalReport.preserved_clinical_elements || [
                      "Preserved numerical dosages, vitals and clinical measurement units",
                      "Preserved clinical acronyms (GCS, BP, IV, COPD) without destructive lowercasing",
                      "Preserved negative assertion terms ('no', 'without') to prevent dangerous false-positive inferences"
                    ]).map((item, idx) => (
                      <li key={idx} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={14} color="#818cf8" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setActiveModalReport(null)}
              >
                Close
              </button>
              <button 
                className="btn-primary" 
                onClick={() => {
                  onSelectReport(activeModalReport.report_id);
                  setActiveModalReport(null);
                  onNavigate('analyze');
                }}
              >
                <Activity size={16} /> Load into PULSE Engine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
