import React, { useState, useEffect } from 'react';
import { Mail, ChevronRight, ArrowLeft } from 'lucide-react';
import { apiGet, timeAgo } from '../api.js';

export default function InboxPage() {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet("/emails?limit=50");
        setEmails(data);
      } catch (err) {
        console.error("Fetch emails error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openEmail = async (id) => {
    try {
      const data = await apiGet(`/emails/${id}`);
      setSelectedEmail(data);
    } catch (err) {
      console.error("Fetch email detail error:", err.message);
    }
  };

  // Detail view
  if (selectedEmail) {
    return (
      <div className="dashboard-scroll">
        <div className="animate-fade-in">
          <button className="btn-back" onClick={() => setSelectedEmail(null)}>
            <ArrowLeft size={16} /> Back to Inbox
          </button>

          <div className="panel glass" style={{ marginTop: '1rem' }}>
            <div className="email-detail-header">
              <h2 className="email-detail-subject">{selectedEmail.subject}</h2>
              <div className="email-detail-meta">
                <span>From: <strong>{selectedEmail.from}</strong></span>
                <span>•</span>
                <span>{timeAgo(selectedEmail.receivedAt)}</span>
                {selectedEmail.processed && (
                  <span className="email-status-badge processed">✓ Processed</span>
                )}
              </div>
            </div>

            {selectedEmail.summary && (
              <div className="email-summary-box">
                <h4>✦ AI Summary</h4>
                <p>{selectedEmail.summary}</p>
              </div>
            )}

            {selectedEmail.extractedTasks && selectedEmail.extractedTasks.length > 0 && (
              <div className="email-tasks-box">
                <h4>Extracted Tasks ({selectedEmail.extractedTasks.length})</h4>
                <div className="email-task-list">
                  {selectedEmail.extractedTasks.map((task, i) => (
                    <div key={i} className="email-task-item">
                      <span className="email-task-title">{task.title}</span>
                      <div className="email-task-meta">
                        {task.deadline && <span>Due: {task.deadline}</span>}
                        {task.suggestedPriority && (
                          <span className={`priority-badge priority-${task.suggestedPriority}`}>
                            {task.suggestedPriority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="email-body-box">
              <h4>Original Email</h4>
              <pre className="email-body-content">{selectedEmail.body}</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="dashboard-scroll">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-semibold mb-1">Inbox</h2>
        <p className="text-secondary mb-6">Emails ingested and processed by AI via n8n pipelines.</p>
      </div>

      <div className="panel glass animate-fade-in delay-1">
        <div className="panel-header">
          <h3 className="panel-title"><Mail size={16} /> Processed Emails</h3>
          <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>
            {emails.length} email{emails.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="email-list">
          {loading && (
            <div className="task-loading-skeleton">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-row" />)}
            </div>
          )}
          {!loading && emails.length === 0 && (
            <div className="empty-state">
              <Mail size={32} className="text-secondary" />
              <p>No emails ingested yet.</p>
              <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>
                Trigger an email ingestion workflow from the Dashboard, or POST to <code>/api/n8n/ingest-email</code>.
              </p>
            </div>
          )}
          {emails.map(email => (
            <div key={email._id} className="email-item" onClick={() => openEmail(email._id)}>
              <div className="email-item-left">
                <div className={`email-dot ${email.processed ? 'processed' : 'unprocessed'}`} />
                <div className="email-item-info">
                  <div className="email-item-subject">{email.subject}</div>
                  <div className="email-item-from">
                    {email.from} · {timeAgo(email.receivedAt)}
                    {email.summary && (
                      <span className="email-summary-preview"> — {email.summary.substring(0, 80)}...</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="email-item-right">
                {email.extractedTasks && email.extractedTasks.length > 0 && (
                  <span className="email-task-count">{email.extractedTasks.length} task{email.extractedTasks.length > 1 ? 's' : ''}</span>
                )}
                <ChevronRight size={16} className="text-secondary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
