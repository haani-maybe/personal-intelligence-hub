import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, CheckCircle2, Mail, FileText,
  TrendingUp, Zap, RefreshCw, ChevronRight, AlertCircle,
  Clock, Circle
} from 'lucide-react';
import { apiGet, apiPost, timeAgo } from '../api.js';
import TaskDetailPanel from '../components/TaskDetailPanel.jsx';

const PRIORITY_COLORS = {
  critical: 'var(--danger)',
  high: 'var(--warning)',
  medium: '#60a5fa',
  low: 'var(--text-muted)',
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="panel glass stat-card">
      <div className="stat-card-top">
        <Icon size={16} style={{ color: color || 'var(--text-secondary)' }} />
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [emails, setEmails] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, e, n, a] = await Promise.all([
        apiGet('/tasks'),
        apiGet('/emails?limit=100'),
        apiGet('/notes?limit=100'),
        apiGet('/activity?limit=10'),
      ]);
      setTasks(t);
      setEmails(e);
      setNotes(n);
      setActivity(a);
    } catch (err) {
      console.error('Dashboard load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // show today's saved brief if one exists
  useEffect(() => {
    apiGet('/ai/daily-brief').then(setBrief).catch(err => console.error('Brief load error:', err.message));
  }, []);

  const generateBrief = async () => {
    setBriefLoading(true);
    try {
      const result = await apiPost('/ai/daily-brief');
      setBrief(result);
    } catch (err) {
      console.error('Brief error:', err.message);
    } finally {
      setBriefLoading(false);
    }
  };

  const completedToday = tasks.filter(t => {
    if (!t.completed) return false;
    const updated = new Date(t.updatedAt);
    const today = new Date();
    return updated.toDateString() === today.toDateString();
  }).length;

  const topTasks = [...tasks]
    .filter(t => !t.completed)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);

  const activityTypeIcon = (type) => {
    const map = { gemini: '✦', n8n: '⚡', system: '◈' };
    return map[type] || '·';
  };

  return (
    <div className="dashboard-scroll">
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSaved={(t) => {
            setTasks(prev => prev.map(x => x._id === t._id ? t : x));
            setSelectedTask(null);
          }}
          onDeleted={(id) => {
            setTasks(prev => prev.filter(x => x._id !== id));
            setSelectedTask(null);
          }}
        />
      )}
      {/* Header */}
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.2rem' }}>Dashboard</h2>
            <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button className="icon-btn" onClick={load} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid animate-fade-in">
        <StatCard icon={CheckCircle2} label="Active Tasks" value={tasks.filter(t => !t.completed).length} sub={`${completedToday} done today`} color="var(--success)" />
        <StatCard icon={Mail} label="Emails" value={emails.length} sub={`${emails.filter(e => !e.processed).length} unprocessed`} color="#60a5fa" />
        <StatCard icon={FileText} label="Notes" value={notes.length} color="var(--warning)" />
        <StatCard icon={TrendingUp} label="Completed" value={tasks.filter(t => t.completed).length} sub={`of ${tasks.length} total`} color="var(--text-secondary)" />
      </div>

      <div className="dashboard-cols animate-fade-in delay-1">
        {/* Top Tasks */}
        <div className="panel glass">
          <div className="panel-header">
            <h3 className="panel-title"><TrendingUp size={14} /> Priority Queue</h3>
            <span className="text-secondary" style={{ fontSize: '0.75rem' }}>by score</span>
          </div>
          {loading ? (
            <div className="task-loading-skeleton">
              {[1,2,3,4].map(i => <div key={i} className="skeleton-row" />)}
            </div>
          ) : topTasks.length === 0 ? (
            <div className="empty-state"><Circle size={28} /><p>No pending tasks</p></div>
          ) : (
            <div>
              {topTasks.map(task => (
                <div key={task._id} className="task-row clickable" onClick={() => setSelectedTask(task)}>
                  <div className="task-row-left">
                    <div className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] || 'var(--text-muted)' }} />
                    <div>
                      <div className="task-title">{task.title}</div>
                      {task.reason && <div className="task-reason">{task.reason}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{task.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Daily Brief */}
          <div className="panel glass">
            <div className="panel-header">
              <h3 className="panel-title"><Zap size={14} /> Daily Brief</h3>
              <button className="btn-sm" onClick={generateBrief} disabled={briefLoading}>
                {briefLoading ? <><RefreshCw size={12} className="spin" /> Generating...</> : brief ? 'Regenerate' : 'Generate'}
              </button>
            </div>
            {!brief ? (
              <p className="text-secondary" style={{ fontSize: '0.8125rem', padding: '0.5rem 0' }}>
                No brief yet today. Click Generate to get an AI summary of your day.
              </p>
            ) : (
              <div style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {brief.brief}
                {brief.updatedAt && <div className="text-secondary" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Generated {timeAgo(brief.updatedAt)}</div>}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="panel glass">
            <div className="panel-header">
              <h3 className="panel-title"><Clock size={14} /> Activity</h3>
            </div>
            {loading ? (
              <div className="task-loading-skeleton">{[1,2,3].map(i => <div key={i} className="skeleton-row" style={{ height: 36 }} />)}</div>
            ) : activity.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>No activity yet.</p>
            ) : (
              <div>
                {activity.map(a => (
                  <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }}>{activityTypeIcon(a.type)}</span>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{a.title}</div>
                        {a.details && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{a.details}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '0.5rem' }}>{timeAgo(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
