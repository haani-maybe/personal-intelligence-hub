import React, { useState, useEffect } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { apiGet, apiPost, apiPatch, timeAgo } from '../api.js';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setTaskTitle] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);

  // Fetch tasks + activity on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tasksData, activityData] = await Promise.all([
          apiGet("/tasks"),
          apiGet("/activity?limit=10"),
        ]);
        setTasks(tasksData);
        setActivities(activityData);
      } catch (err) {
        console.error("Dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Computed metrics — derived from real task data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const highPriorityTasks = tasks.filter(t => !t.completed && (t.priority === "high" || t.priority === "critical")).length;
  const productivityScore = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // Build chart data from task scores (group by creation hour)
  const chartData = React.useMemo(() => {
    if (tasks.length === 0) return [];

    const hourMap = {};
    tasks.forEach(t => {
      if (!t.createdAt) return;
      const hour = new Date(t.createdAt).getHours();
      const timeLabel = `${String(hour).padStart(2, '0')}:00`;
      if (!hourMap[timeLabel]) {
        hourMap[timeLabel] = { time: timeLabel, score: 0, tasks: 0, total: 0 };
      }
      hourMap[timeLabel].total += t.score || 0;
      hourMap[timeLabel].tasks += 1;
    });

    return Object.values(hourMap)
      .map(h => ({ ...h, score: h.tasks > 0 ? Math.round(h.total / h.tasks) : 0 }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks]);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const toggleTask = async (id) => {
    const updatedTask = await apiPatch(`/tasks/${id}`);
    setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
  };

  const runWorkflow = async () => {
    if (workflowLoading) return;
    setWorkflowLoading(true);
    try {
      await apiPost("/n8n/trigger", { workflow: "email-ingest" });
      // Refresh data after triggering
      const [tasksData, activityData] = await Promise.all([
        apiGet("/tasks"),
        apiGet("/activity?limit=10"),
      ]);
      setTasks(tasksData);
      setActivities(activityData);
    } catch (err) {
      console.error("Workflow trigger failed:", err.message);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const createdTask = await apiPost("/tasks", {
        title: newTaskTitle,
        source: "Manual",
        time: "Today",
        completed: false,
      });
      setTasks(prev => [createdTask, ...prev]);
      setTaskTitle("");
    } catch (err) {
      console.error("Create task failed:", err.message);
    }
  };

  // Activity type icons
  const typeIcons = {
    n8n: "⚡", gemini: "✦", telegram: "✈", system: "⚙", email: "✉", task: "✓"
  };

  return (
    <div className="dashboard-scroll">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-semibold mb-1">{greeting}</h2>
        <p className="text-secondary mb-6">Here is your AI-curated daily brief and task priorities.</p>

        <div className="metrics-banner">
          <div className="metric-item">
            <span className="metric-title">Productivity Score</span>
            <div className="metric-value">{productivityScore}<span className="metric-denom">/100</span></div>
            <div className={`metric-trend ${productivityScore >= 50 ? 'up' : 'down'}`}>
              {completedTasks} of {totalTasks} tasks done
            </div>
          </div>

          <div className="metric-item">
            <span className="metric-title">Tasks Completed</span>
            <div className="metric-value">{completedTasks}</div>
            <div className="metric-trend up">{pendingTasks} remaining</div>
          </div>

          <div className="metric-item">
            <span className="metric-title">Activity Events</span>
            <div className="metric-value">{activities.length}</div>
            <div className="metric-trend">Recent system events</div>
          </div>

          <div className="metric-item">
            <span className="metric-title">High Priority</span>
            <div className="metric-value">{highPriorityTasks}</div>
            <div className={`metric-trend ${highPriorityTasks > 0 ? 'down' : 'up'}`}>
              {highPriorityTasks > 0 ? "Needs attention" : "All clear"}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid animate-fade-in delay-1">
        <div className="panel glass">
          <div className="panel-header">
            <h3 className="panel-title">Productivity Analytics</h3>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', borderColor: 'var(--border-color)', borderRadius: '6px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--text-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--success)' }} />
                  <Line type="monotone" dataKey="tasks" stroke="var(--text-secondary)" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>No task data yet. Create some tasks to see analytics.</p>
              </div>
            )}
          </div>
        </div>

        <div className="panel glass">
          <div className="panel-header">
            <h3 className="panel-title">System Activity</h3>
          </div>
          <div className="create-task-bar">
            <input
              type="text"
              placeholder="Create new task..."
              value={newTaskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
            />
            <button onClick={createTask}>
              <Plus size={14} />
              Add
            </button>
          </div>
          <div className="activity-list">
            {activities.length === 0 && !loading && (
              <div className="activity-item">
                <div className="activity-details">
                  <p className="text-secondary">No activity yet. Trigger a workflow to get started.</p>
                </div>
              </div>
            )}
            {activities.map(log => (
              <div key={log._id} className="activity-item">
                <div className="activity-details">
                  <p>
                    <span className="activity-type-icon">{typeIcons[log.type] || "•"}</span>
                    {" "}{log.title}
                  </p>
                  <div className="activity-time">{timeAgo(log.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel glass animate-fade-in delay-2">
        <div className="panel-header">
          <h3 className="panel-title">AI-Prioritized Tasks</h3>
          <button className="btn-primary" onClick={runWorkflow} disabled={workflowLoading}>
            {workflowLoading ? "Running..." : "Run Workflow"}
          </button>
        </div>

        <div className="task-list">
          {loading && (
            <div className="task-loading-skeleton">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-row" />)}
            </div>
          )}
          {!loading && tasks.length === 0 && (
            <p className="text-secondary" style={{ padding: '1rem', textAlign: 'center' }}>No tasks yet. Create one above or trigger an email ingestion workflow.</p>
          )}
          {tasks
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map(task => (
              <div key={task._id} className={`task-item ${task.completed ? 'opacity-50' : ''}`}>
                <div className="task-content">
                  <div
                    className={`task-checkbox ${task.completed ? 'completed' : ''}`}
                    onClick={() => toggleTask(task._id)}
                  >
                    {task.completed && <CheckCircle2 size={14} color="white" />}
                  </div>
                  <div className="task-info">
                    <h4 style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      {task.title}
                    </h4>
                    <div className="task-meta">
                      <span>Source: {task.source}</span>
                      <span>•</span>
                      <span>{task.time || (task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline')}</span>
                      {task.reason && task.reason !== "Rule-based scoring" && (
                        <>
                          <span>•</span>
                          <span className="task-reason">{task.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
                  <div className="score-badge">AI: {task.score}</div>
                  <div className={`priority-badge priority-${task.priority}`}>
                    {(task.priority || "low").toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
