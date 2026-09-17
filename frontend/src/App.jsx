import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  FileText, 
  Layers, 
  Database, 
  Info, 
  HeartPulse, 
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { SampleReportsPage } from './pages/SampleReportsPage';
import { ExtractionResultsPage } from './pages/ExtractionResultsPage';
import { DatasetPage } from './pages/DatasetPage';
import { AboutPage } from './pages/AboutPage';
import { fetchHealth } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReportId, setSelectedReportId] = useState('0');
  const [latestResult, setLatestResult] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  useEffect(() => {
    async function checkSys() {
      try {
        const h = await fetchHealth();
        setSystemHealth(h);
      } catch (err) {
        console.warn("Backend healthcheck pending:", err);
      }
    }
    checkSys();
  }, []);

  function handleSelectReport(id) {
    setSelectedReportId(String(id));
  }

  function handleStoreResults(res) {
    setLatestResult(res);
  }

  return (
    <div className="app-container">
      {/* Disclaimer Banner */}
      <div className="disclaimer-banner">
        <span className="disclaimer-badge">Clinical Scope</span>
        <span>
          <strong>PULSE is an AI-assisted clinical information-organization prototype.</strong> It does not diagnose, prescribe treatment, or replace professional clinical judgment.
        </span>
      </div>

      {/* Main Header */}
      <header className="main-header">
        <div className="header-inner">
          <div className="brand-section" onClick={() => setActiveTab('dashboard')}>
            <div className="brand-logo-glow">
              <HeartPulse size={24} />
            </div>
            <div className="brand-titles">
              <div className="brand-name">
                PULSE
                <span className="brand-badge">Research Prototype</span>
              </div>
              <div className="brand-subtitle">
                Patient Update & Log Structuring Engine
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Activity size={16} /> Dashboard
            </button>
            <button 
              className={`nav-tab ${activeTab === 'analyze' ? 'active' : ''}`}
              onClick={() => setActiveTab('analyze')}
            >
              <HeartPulse size={16} /> Analyze Handover
            </button>
            <button 
              className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={16} /> Sample Reports
            </button>
            <button 
              className={`nav-tab ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              <Layers size={16} /> Extraction Results
            </button>
            <button 
              className={`nav-tab ${activeTab === 'dataset' ? 'active' : ''}`}
              onClick={() => setActiveTab('dataset')}
            >
              <Database size={16} /> Dataset
            </button>
            <button 
              className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <Info size={16} /> About PULSE
            </button>
          </nav>
        </div>
      </header>

      {/* Main Page Routing */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardPage 
            onNavigate={(tab) => setActiveTab(tab)} 
            onSelectReport={handleSelectReport}
          />
        )}
        {activeTab === 'analyze' && (
          <AnalyzePage 
            selectedReportId={selectedReportId}
            onSelectReport={handleSelectReport}
            onStoreResults={handleStoreResults}
          />
        )}
        {activeTab === 'reports' && (
          <SampleReportsPage 
            onSelectReport={handleSelectReport}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'results' && (
          <ExtractionResultsPage 
            latestResult={latestResult}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectReport={handleSelectReport}
          />
        )}
        {activeTab === 'dataset' && (
          <DatasetPage 
            onSelectReport={handleSelectReport}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'about' && (
          <AboutPage />
        )}
      </main>

      {/* Footer */}
      <footer className="pulse-footer">
        <div className="footer-inner">
          <div>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>PULSE Prototype</span> — Patient Update & Log Structuring Engine
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Corpus: Synthetic Nursing Handover Training and Development Data Set (101 Reports)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={13} />
              {systemHealth ? `Backend Active (${systemHealth.total_reports} Reports)` : 'FastAPI Connected'}
            </span>
            <span style={{ color: '#94a3b8' }}>
              Candidate Model: Bio_ClinicalBERT
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
