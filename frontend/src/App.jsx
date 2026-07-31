import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Search, Bell, Settings } from 'lucide-react';
import './index.css';

// Pages
import DashboardPage from './pages/DashboardPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import WorkflowsPage from './pages/WorkflowsPage.jsx';

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Top Navbar */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="brand">
              <span className="brand-terminal-symbol">$</span>
              <h1 className="brand-title">hub/core</h1>
            </div>

            <nav className="nav-menu">
              <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                Dashboard
              </NavLink>
              <NavLink to="/inbox" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                Inbox
              </NavLink>
              <NavLink to="/workflows" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                Workflows
              </NavLink>
            </nav>
          </div>

          <div className="topbar-right">
            <div className="search-bar">
              <Search size={14} className="text-secondary" />
              <input
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="search-shortcut">⌘K</kbd>
            </div>

            <button className="icon-btn">
              <Bell size={18} />
            </button>
            <button className="icon-btn">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Main Content — routed pages */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
