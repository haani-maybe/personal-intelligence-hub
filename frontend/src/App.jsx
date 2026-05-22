import React, { useState, useEffect } from 'react';
import { Search, Bell, Settings, CheckCircle2 } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import './index.css';

const productivityData = [
  { time: '08:00', score: 45, tasks: 2 },
  { time: '10:00', score: 68, tasks: 5 },
  { time: '12:00', score: 85, tasks: 8 },
  { time: '14:00', score: 72, tasks: 4 },
  { time: '16:00', score: 90, tasks: 7 },
  { time: '18:00', score: 95, tasks: 9 },
  { time: '20:00', score: 82, tasks: 3 },
];

const activityLog = [
  { id: 1, type: 'n8n', title: 'Processed 15 new emails', time: '10 mins ago' },
  { id: 2, type: 'gemini', title: 'Generated daily summary brief', time: '1 hour ago' },
  { id: 3, type: 'telegram', title: 'Sent daily brief to Telegram', time: '1 hour ago' },
  { id: 4, type: 'system', title: 'FAISS index synchronization complete', time: '3 hours ago' },
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [newTaskTitle, setTaskTitle] = useState("");
  useEffect(() => {
    setLoading(true);

    fetch("http://localhost:5000/api/tasks")
    .then(res => res.json())
    .then(data => setTasks(data))
    .finally(() => setLoading(false))
  }, []);

  const toggleTask = async(id) => {
    //send PATCH req to backend to toggle completed field of that task document in db, 
    // then get that updated document back to frontend to update UI
    const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: "PATCH"
    });
    //update backend 
    const updatedTask = await res.json();
    setTasks(prev => prev.map(t=> 
      t._id === updatedTask._id ? updatedTask : t)
    )
  };

  const runWorkflow = async() => {
    if(loading)
      return;
    setLoading(true)

    const res = await fetch("http://localhost:5000/api/tasks");
    const data = await res.json()

    setTasks(data)

    setLoading(false)

  }

  const createTask = async() => {
    if(!newTaskTitle.trim()) 
      return

    const res = await fetch("http://localhost:5000/api/tasks", {
      //send json data to backend, so it can create new task document in db, 
      // then return that created document back to frontend to update UI
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body:JSON.stringify({
        title:newTaskTitle,
        source:"Manual",
        time:"Today",
        completed:false
      })
    });
      const createdTask = await res.json()

      setTasks(prev => [createdTask, ...prev])
      setTaskTitle("");
  }



  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">
            <span className="brand-terminal-symbol">$</span>
            <h1 className="brand-title">hub/core</h1>
          </div>
          
          <nav className="nav-menu">
            <a href="#" className="nav-item active">Dashboard</a>
            <a href="#" className="nav-item">Tasks</a>
            <a href="#" className="nav-item">Inbox</a>
            <a href="#" className="nav-item">Telegram</a>
            <a href="#" className="nav-item">Workflows</a>
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
            <span className="badge">3</span>
          </button>
          <button className="icon-btn">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">

        <div className="dashboard-scroll">
          <div className="animate-fade-in">
            <h2 className="text-2xl font-semibold mb-1">Good Morning, Alex</h2>
            <p className="text-secondary mb-6">Here is your AI-curated daily brief and task priorities.</p>
            
            <div className="metrics-banner">
              <div className="metric-item">
                <span className="metric-title">Productivity Score</span>
                <div className="metric-value">94<span className="metric-denom">/100</span></div>
                <div className="metric-trend up">+12% from yesterday</div>
              </div>
              
              <div className="metric-item">
                <span className="metric-title">Tasks Completed</span>
                <div className="metric-value">12</div>
                <div className="metric-trend up">+3 this morning</div>
              </div>
              
              <div className="metric-item">
                <span className="metric-title">Emails Processed</span>
                <div className="metric-value">48</div>
                <div className="metric-trend">Automated by n8n</div>
              </div>
              
              <div className="metric-item">
                <span className="metric-title">High Priority</span>
                <div className="metric-value">2</div>
                <div className="metric-trend down">Needs attention soon</div>
              </div>
            </div>
          </div>

          <div className="dashboard-grid animate-fade-in delay-1">
            <div className="panel glass">
              <div className="panel-header">
                <h3 className="panel-title">Productivity Analytics</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121214', borderColor: 'var(--border-color)', borderRadius: '6px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="var(--text-primary)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--success)' }} />
                  </LineChart>
                </ResponsiveContainer>
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
                />

              <button onClick={createTask}>
                Add Task
              </button>
            </div>
              <div className="activity-list">
                {activityLog.map(log => (
                  <div key={log.id} className="activity-item">
                    <div className="activity-details">
                      <p>{log.title}</p>
                      <div className="activity-time">{log.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel glass animate-fade-in delay-2">
            <div className="panel-header">
              <h3 className="panel-title">AI-Prioritized Tasks</h3>
              <button className="btn-primary" onClick= {runWorkflow} disabled = {loading}>
                Run Workflow
              </button>
            </div>
            
            <div className="task-list">
              {loading && <p>Loading tasks...</p>}
              {tasks.map(task => (
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
                        <span>{task.time}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center" style={{ gap: '1rem', display: 'flex', alignItems: 'center' }}>
                    <div className="score-badge">AI Score: {task.score}</div>
                    <div className={`priority-badge priority-${task.priority}`}>
                      {task.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
