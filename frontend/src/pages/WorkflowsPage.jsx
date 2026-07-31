import React, { useState, useEffect } from 'react';
import { Zap, Play, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { apiGet, apiPost, timeAgo } from '../api.js';

export default function WorkflowsPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null); // which workflow is being triggered

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet("/activity?type=n8n&limit=30");
        setActivities(data);
      } catch (err) {
        console.error("Fetch workflow activity error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const triggerWorkflow = async (workflow) => {
    setTriggering(workflow);
    try {
      await apiPost("/n8n/trigger", { workflow });
      // Refresh activity log
      const data = await apiGet("/activity?type=n8n&limit=30");
      setActivities(data);
    } catch (err) {
      console.error("Trigger failed:", err.message);
    } finally {
      setTriggering(null);
    }
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />;
      case 'error': return <XCircle size={14} style={{ color: 'var(--danger)' }} />;
      case 'running': return <Clock size={14} style={{ color: 'var(--warning)' }} />;
      case 'pending': return <Clock size={14} style={{ color: 'var(--text-secondary)' }} />;
      default: return <Zap size={14} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const workflows = [
    {
      id: 'email-ingest',
      name: 'Email Ingestion',
      description: 'Fetch new emails, summarize with AI, extract tasks',
      icon: '✉',
    },
    {
      id: 'process',
      name: 'Data Processing',
      description: 'Run processing pipeline on ingested data',
      icon: '⚙',
    },
  ];

  return (
    <div className="dashboard-scroll">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-semibold mb-1">Workflows</h2>
        <p className="text-secondary mb-6">Manage and trigger n8n automation pipelines.</p>
      </div>

      {/* Workflow trigger cards */}
      <div className="workflow-grid animate-fade-in delay-1">
        {workflows.map(wf => (
          <div key={wf.id} className="panel glass workflow-card">
            <div className="workflow-card-header">
              <span className="workflow-icon">{wf.icon}</span>
              <div>
                <h3 className="workflow-name">{wf.name}</h3>
                <p className="workflow-desc">{wf.description}</p>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => triggerWorkflow(wf.id)}
              disabled={triggering === wf.id}
            >
              {triggering === wf.id ? (
                <><Clock size={14} /> Running...</>
              ) : (
                <><Play size={14} /> Trigger</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Run history */}
      <div className="panel glass animate-fade-in delay-2" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header">
          <h3 className="panel-title"><Zap size={16} /> Run History</h3>
          <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>
            {activities.length} event{activities.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="workflow-history">
          {loading && (
            <div className="task-loading-skeleton">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-row" />)}
            </div>
          )}
          {!loading && activities.length === 0 && (
            <div className="empty-state">
              <Zap size={32} className="text-secondary" />
              <p>No workflow runs yet.</p>
              <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>
                Trigger a workflow above to get started.
              </p>
            </div>
          )}
          {activities.map(activity => (
            <div key={activity._id} className="workflow-history-item">
              <div className="workflow-history-left">
                {statusIcon(activity.status)}
                <div>
                  <div className="workflow-history-title">{activity.title}</div>
                  {activity.details && (
                    <div className="workflow-history-details">{activity.details.substring(0, 120)}</div>
                  )}
                </div>
              </div>
              <div className="workflow-history-time">{timeAgo(activity.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
