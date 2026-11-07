import { useState, useEffect } from 'react';
import { FileText, Plus, X, Trash2, Tag } from 'lucide-react';
import { apiGet, apiPost, apiDelete, timeAgo } from '../api.js';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const url = '/notes';
      const data = await apiGet(url);
      setNotes(data);
    } catch (err) {
      console.error('Fetch notes error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];
  const visibleNotes = activeTag ? notes.filter(n => n.tags?.includes(activeTag)) : notes;

  const filterByTag = (tag) => {
    const next = activeTag === tag ? null : tag;
    setActiveTag(next);
    // tags come from the full list, filtering is client side so other tags dont disappear
  };

  const saveNote = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await apiPost('/notes', { title: form.title, content: form.content, tags });
      setForm({ title: '', content: '', tags: '' });
      setShowForm(false);
      load();
    } catch (err) {
      console.error('Save note error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id) => {
    setDeleting(id);
    try {
      await apiDelete(`/notes/${id}`);
      setNotes(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Delete note error:', err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="dashboard-scroll">
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.2rem' }}>Notes</h2>
          <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>Semantic search enabled — notes are embedded automatically.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Note</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="panel glass animate-fade-in" style={{ marginBottom: '1.25rem' }}>
          <form onSubmit={saveNote}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input
                className="notes-input"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
              <textarea
                className="notes-input notes-textarea"
                placeholder="Content..."
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                required
                rows={4}
              />
              <input
                className="notes-input"
                placeholder="Tags (comma-separated, e.g. work, ai, ideas)"
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="notes-tags-row animate-fade-in">
          <Tag size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag-chip ${activeTag === tag ? 'active' : ''}`}
              onClick={() => filterByTag(tag)}
            >
              {tag}
            </button>
          ))}
          {activeTag && (
            <button className="tag-chip" onClick={() => filterByTag(null)}>✕ Clear</button>
          )}
        </div>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="task-loading-skeleton">{[1,2,3].map(i => <div key={i} className="skeleton-row" style={{ height: 100 }} />)}</div>
      ) : visibleNotes.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '3rem' }}>
          <FileText size={32} />
          <p>No notes yet.</p>
          <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>Click "New Note" to create your first note.</p>
        </div>
      ) : (
        <div className="notes-grid animate-fade-in">
          {visibleNotes.map(note => (
            <div key={note._id} className="panel glass note-card">
              <div className="note-card-header">
                <h4 className="note-title">{note.title}</h4>
                <button
                  className="icon-btn"
                  style={{ color: 'var(--text-muted)', opacity: deleting === note._id ? 0.4 : 1 }}
                  onClick={() => deleteNote(note._id)}
                  disabled={deleting === note._id}
                  title="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="note-content">{note.content}</p>
              {note.tags?.length > 0 && (
                <div className="note-tags">
                  {note.tags.map(tag => (
                    <span key={tag} className="tag-chip" onClick={() => filterByTag(tag)} style={{ cursor: 'pointer' }}>{tag}</span>
                  ))}
                </div>
              )}
              <div className="note-footer">{timeAgo(note.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
