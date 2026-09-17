import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  ArrowRight, 
  Activity, 
  ExternalLink, 
  X, 
  Check, 
  Layers 
} from 'lucide-react';
import { fetchReports, fetchReport } from '../services/api';

export function SampleReportsPage({ onSelectReport, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalReport, setActiveModalReport] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

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

      {/* Modal / Drawer for Selected Report Preview */}
      {activeModalReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="pulse-card" style={{ maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#0e1626', border: '1px solid rgba(99, 102, 241, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Report #{activeModalReport.report_id} ({activeModalReport.filename})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {activeModalReport.word_count} words | {activeModalReport.char_count} characters
                </span>
              </div>
              <button 
                onClick={() => setActiveModalReport(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="comparison-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="comparison-box">
                <span className="comparison-title" style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>RAW HANDOVER TEXT</span>
                <div className="comparison-content">
                  {activeModalReport.raw_text}
                </div>
              </div>

              <div className="comparison-box" style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                <span className="comparison-title" style={{ color: '#38bdf8', marginBottom: '0.5rem' }}>PREPROCESSED TEXT</span>
                <div className="comparison-content">
                  {activeModalReport.preprocessed_text}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
