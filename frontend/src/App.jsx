import React, { useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Search, Bell, Settings, X, Mail, FileText, CheckSquare, Loader } from 'lucide-react';
import './index.css';

import DashboardPage from './pages/DashboardPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import WorkflowsPage from './pages/WorkflowsPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import { apiPost } from './api.js';

function SearchModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const data = await apiPost('/ai/search', { query: q, topK: 8 });
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 450);
  };

  const typeIcon = (type) => {
    if (type === 'email') return <Mail size={12} />;
    if (type === 'note') return <FileText size={12} />;
    return <CheckSquare size={12} />;
  };

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-modal-input-row">
          <Search size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            autoFocus
            className="search-modal-input"
            placeholder="Search emails, notes, tasks..."
            value={query}
            onChange={handleChange}
          />
          {searching && <Loader size={14} className="spin" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {results !== null && (
          <div className="search-results">
            {results.length === 0 ? (
              <div className="search-empty">No results for "{query}"</div>
            ) : (
              results.map((r, i) => (
                <div key={i} className="search-result-item">
                  <div className="search-result-type">{typeIcon(r.type)}<span>{r.type}</span></div>
                  <div className="search-result-title">{r.title}</div>
                  {r.snippet && <div className="search-result-snippet">{r.snippet}</div>}
                  <div className="search-result-score">relevance: {(r.score * 100).toFixed(0)}%</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AppInner() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="app-container">
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">
            <span className="brand-terminal-symbol">$</span>
            <h1 className="brand-title">hub/core</h1>
          </div>
          <nav className="nav-menu">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>Dashboard</NavLink>
            <NavLink to="/inbox" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Inbox</NavLink>
            <NavLink to="/notes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Notes</NavLink>
            <NavLink to="/workflows" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>Workflows</NavLink>
          </nav>
        </div>
        <div className="topbar-right">
          <div className="search-bar" onClick={() => setSearchOpen(true)} style={{ cursor: 'pointer' }}>
            <Search size={14} className="text-secondary" />
            <span className="search-input" style={{ color: 'var(--text-muted)', userSelect: 'none' }}>Search...</span>
            <kbd className="search-shortcut">⌘K</kbd>
          </div>
          <button className="icon-btn"><Bell size={18} /></button>
          <button className="icon-btn"><Settings size={18} /></button>
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
