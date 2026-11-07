import { useState, useEffect } from 'react';
import { Mail, ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, Inbox } from 'lucide-react';
import { apiGet, apiPost, timeAgo } from '../api.js';

export default function InboxPage() {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingTask, setAddingTask] = useState(null); // which task title is being added
  const [addedTasks, setAddedTasks] = useState(new Set());

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet('/emails?limit=50');
        setEmails(data);
      } catch (err) {
        console.error('Fetch emails error:', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openEmail = async (email) => {
    // Fetch full email (with summary + extractedTasks)
    try {
      const full = await apiGet(`/emails/${email._id}`);
      setSelected(full);
    } catch {
      setSelected(email);
    }
  };

  const addTaskToBoard = async (extractedTask) => {
    const key = extractedTask.title;
    setAddingTask(key);
    try {
      await apiPost('/tasks', {
        title: extractedTask.title,
        description: extractedTask.reasoning || '',
        deadline: extractedTask.deadline || null,
        source: 'Email',
        category: 'general',
        sourceEmailId: selected._id,
      });
      setAddedTasks(prev => new Set([...prev, key]));
    } catch (err) {
      console.error('Add task error:', err.message);
    } finally {
      setAddingTask(null);
    }
  };

  if (selected) {
    return (
      <div className="dashboard-scroll">
        <button className="btn-back" onClick={() => setSelected(null)}>
          <ChevronLeft size={14} /> Back to Inbox
        </button>

        <div style={{ marginTop: '1rem' }}>
          <div className="email-detail-header">
            <div className="email-detail-subject">{selected.subject}</div>
            <div className="email-detail-meta">
              <span>From: <strong>{selected.from}</strong></span>
              <span>·</span>
              <span>{timeAgo(selected.receivedAt)}</span>
              {selected.processed && (
                <span className="email-status-badge processed">✦ AI Processed</span>
              )}
            </div>
          </div>

          {selected.summary && (
            <div className="email-summary-box">
              <h4>✦ AI Summary</h4>
              <p>{selected.summary}</p>
            </div>
          )}

          {selected.extractedTasks?.length > 0 && (
            <div className="email-tasks-box">
              <h4>⚡ Extracted Tasks ({selected.extractedTasks.length})</h4>
              <div className="email-task-list">
                {selected.extractedTasks.map((task, i) => {
                  const isAdded = addedTasks.has(task.title) || !!task.taskId;
                  return (
                    <div key={i} className="email-task-item">
                      <div>
                        <div className="email-task-title">{task.title}</div>
                        <div className="email-task-meta">
                          {task.deadline && <span>Due: {task.deadline}</span>}
                          {task.suggestedPriority && (
                            <span className={`priority-badge priority-${task.suggestedPriority}`}>{task.suggestedPriority}</span>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn-sm"
                        disabled={isAdded || addingTask === task.title}
                        onClick={() => addTaskToBoard(task)}
                        style={isAdded ? { opacity: 0.5 } : {}}
                      >
                        {isAdded ? <><CheckCircle2 size={12} /> Added</> : addingTask === task.title ? <><Clock size={12} /> Adding...</> : <><Plus size={12} /> Add Task</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selected.body && (
            <div className="email-body-box">
              <h4>Full Email</h4>
              <pre className="email-body-content">{selected.body}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-scroll">
      <div className="animate-fade-in" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.2rem' }}>Inbox</h2>
        <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>AI-processed emails and extracted tasks.</p>
      </div>

      <div className="panel glass animate-fade-in">
        <div className="panel-header">
          <h3 className="panel-title"><Mail size={14} /> Emails</h3>
          <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>{emails.length} total</span>
        </div>

        {loading ? (
          <div className="task-loading-skeleton">{[1,2,3,4].map(i => <div key={i} className="skeleton-row" />)}</div>
        ) : emails.length === 0 ? (
          <div className="empty-state">
            <Inbox size={32} />
            <p>No emails yet.</p>
            <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>Trigger the Email Ingestion workflow to fetch emails.</p>
          </div>
        ) : (
          <div className="email-list">
            {emails.map(email => (
              <div key={email._id} className="email-item" onClick={() => openEmail(email)}>
                <div className="email-item-left">
                  <div className={`email-dot ${email.processed ? 'processed' : 'unprocessed'}`} />
                  <div className="email-item-info">
                    <div className="email-item-subject">{email.subject}</div>
                    <div className="email-item-from">{email.from}</div>
                  </div>
                </div>
                <div className="email-item-right">
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{timeAgo(email.receivedAt)}</span>
                  {email.extractedTasks?.length > 0 && (
                    <span className="email-task-count">{email.extractedTasks.length} task{email.extractedTasks.length > 1 ? 's' : ''}</span>
                  )}
                  <ChevronRight size={14} className="text-secondary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
