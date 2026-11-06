import React, { useState } from 'react';
import { X, Trash2, Save, Mail } from 'lucide-react';
import { apiPatch, apiDelete } from '../api.js';

const CATEGORIES = ['general', 'work', 'personal', 'meeting'];

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

function ScoreBar({ label, value }) {
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${value ?? 0}%` }} />
      </div>
      <span className="score-bar-value">{value ?? '—'}</span>
    </div>
  );
}

export default function TaskDetailPanel({ task, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    deadline: toDateInput(task.deadline),
    category: task.category || 'general',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch(`/tasks/${task._id}`, form);
      onSaved({ ...task, ...updated });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await apiDelete(`/tasks/${task._id}`);
      onDeleted(task._id);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <aside className="detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <h3 className="panel-title">Task details</h3>
          <button className="icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="detail-body">
          <div className="detail-section">
            <div className="detail-badges">
              <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
              {task.urgencyLabel && <span className="detail-tag">LLM: {task.urgencyLabel}</span>}
              <span className="detail-tag">{task.source}</span>
            </div>
            <ScoreBar label="Final" value={task.score} />
            <ScoreBar label="Rules" value={task.ruleScore} />
            <ScoreBar label="LLM" value={task.llmScore} />
            {task.reason && <p className="detail-reason">{task.reason}</p>}
            {task.sourceEmailId && (
              <p className="detail-reason"><Mail size={12} /> Extracted from an email</p>
            )}
          </div>

          <label className="detail-label">Title
            <input className="detail-input" value={form.title} onChange={set('title')} />
          </label>
          <label className="detail-label">Description
            <textarea className="detail-input" rows={4} value={form.description} onChange={set('description')} />
          </label>
          <div className="detail-row">
            <label className="detail-label">Deadline
              <input type="date" className="detail-input" value={form.deadline} onChange={set('deadline')} />
            </label>
            <label className="detail-label">Category
              <select className="detail-input" value={form.category} onChange={set('category')}>
                {[...new Set([...CATEGORIES, form.category])].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="detail-error">{error}</p>}
        </div>

        <div className="detail-footer">
          <button className="btn-sm btn-danger" onClick={remove}><Trash2 size={12} /> Delete</button>
          <button className="btn-sm" onClick={save} disabled={saving || !form.title.trim()}>
            <Save size={12} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </aside>
    </div>
  );
}
