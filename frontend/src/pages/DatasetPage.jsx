import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  FileText, 
  ExternalLink, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Layers,
  Activity
} from 'lucide-react';
import { fetchReports, fetchReport } from '../services/api';

export function DatasetPage({ onSelectReport, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
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

  async function openReportDetails(reportId) {
    try {
      setModalLoading(true);
      const data = await fetchReport(reportId);
      setSelectedReport(data);
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
    <div className="dataset-container">
      {/* Dataset Overview Information Card */}
      <div className="pulse-card" style={{ marginBottom: '2rem' }}>
        <div className="pulse-card-header">
          <div>
            <h2 className="card-title">
              <Database size={20} color="#06b6d4" /> Research Dataset Specifications
            </h2>
            <p className="card-subtitle">
              Synthetic Nursing Handover Training and Development Data Set – Primary Text Corpus
            </p>
          </div>
          <span className="chip" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: '#06b6d4', color: '#67e8f9', fontWeight: 700 }}>
            Read-Only Preserved
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: '#0a0f1d', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Dataset Name</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginTop: '0.25rem' }}>
              Synthetic Nursing Handover
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Training & Development Corpus</div>
          </div>

          <div style={{ background: '#0a0f1d', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Number of Reports</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
              101 Reports
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Numbered 0.txt to 100.txt</div>
          </div>

          <div style={{ background: '#0a0f1d', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Primary Folder</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', marginTop: '0.35rem' }} className="mono">
              data/101writtenfreetextreports/
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Automatically discovered</div>
          </div>

          <div style={{ background: '#0a0f1d', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>File Format & Purpose</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>
              TXT (Free-text)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Primary clinical handover corpus</div>
          </div>
        </div>
      </div>

      {/* Dataset Table Browser */}
      <div className="pulse-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="card-title">
              <Layers size={18} color="#6366f1" /> Corpus Report Index ({filteredReports.length} shown)
            </h3>
            <p className="card-subtitle">
              Browse report ID, word count, character length, and preview text
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0a0f1d', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.8rem', minWidth: '260px' }}>
            <Search size={15} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search Report ID (e.g. 12)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', outline: 'none', fontSize: '0.85rem', width: '100%' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#06b6d4' }}>
            Loading dataset table...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pulse-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Report ID</th>
                  <th style={{ width: '140px' }}>Filename</th>
                  <th style={{ width: '120px' }}>Word Count</th>
                  <th style={{ width: '130px' }}>Character Count</th>
                  <th>Preview Excerpt</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '110px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.report_id}>
                    <td>
                      <span className="chip" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.4)', color: '#a5b4fc', fontWeight: 700 }}>
                        #{report.report_id}
                      </span>
                    </td>
                    <td className="mono" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {report.filename}
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {report.word_count}
                    </td>
                    <td style={{ color: '#cbd5e1' }}>
                      {report.char_count}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{report.preview}"
                    </td>
                    <td>
                      <span className="chip" style={{ background: 'rgba(52, 211, 153, 0.1)', borderColor: 'rgba(52, 211, 153, 0.3)', color: '#34d399', fontSize: '0.7rem' }}>
                        <CheckCircle2 size={11} /> {report.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => openReportDetails(report.report_id)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
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
          <div className="pulse-card" style={{ maxWidth: '850px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#0e1626', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                  Report #{selectedReport.report_id} ({selectedReport.filename})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {selectedReport.word_count} words | {selectedReport.char_count} characters | Status: Loaded
                </span>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="comparison-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="comparison-box">
                <span className="comparison-title" style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>RAW HANDOVER TEXT</span>
                <div className="comparison-content">
                  {selectedReport.raw_text}
                </div>
              </div>

              <div className="comparison-box" style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                <span className="comparison-title" style={{ color: '#38bdf8', marginBottom: '0.5rem' }}>PREPROCESSED TEXT</span>
                <div className="comparison-content">
                  {selectedReport.preprocessed_text}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedReport(null)}>
                Close
              </button>
              <button 
                className="btn-primary" 
                onClick={() => {
                  onSelectReport(selectedReport.report_id);
                  setSelectedReport(null);
                  onNavigate('analyze');
                }}
              >
                <Activity size={16} /> Analyze in PULSE Engine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
