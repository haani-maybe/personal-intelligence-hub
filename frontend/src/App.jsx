import React, { useState, useEffect } from 'react';
import { 
  Brain, Search, Bell, Settings, LayoutDashboard, 
  CheckSquare, Mail, MessageSquare, Zap, Clock, 
  TrendingUp, CheckCircle2, Circle, Network,
  Terminal, Command, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
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

const mockTasks = [
  {
    id: 1,
    title: "Review Q3 Marketing Strategy",
    source: "Email: Sarah Johnson",
    priority: "high",
    score: 98,
    time: "2 hours left",
    completed: false
  },
  {
    id: 2,
    title: "Approve Backend Architecture PR",
    source: "GitHub Action",
    priority: "high",
    score: 94,
    time: "3 hours left",
    completed: false
  },
  {
    id: 3,
    title: "Update FAISS Index for new documents",
    source: "n8n Automation",
    priority: "medium",
    score: 76,
    time: "Tomorrow",
    completed: true
  },
  {
    id: 4,
    title: "Draft response to investor query",
    source: "Telegram Bot",
    priority: "low",
    score: 42,
    time: "Next Week",
    completed: false
  }
];

const activityLog = [
  { id: 1, type: 'n8n', title: 'Processed 15 new emails', time: '10 mins ago', icon: <Network size={16} className="text-blue-400" /> },
  { id: 2, type: 'gemini', title: 'Generated daily summary brief', time: '1 hour ago', icon: <Brain size={16} className="text-purple-400" /> },
  { id: 3, type: 'telegram', title: 'Sent daily brief to Telegram', time: '1 hour ago', icon: <MessageSquare size={16} className="text-sky-400" /> },
  { id: 4, type: 'system', title: 'FAISS index synchronization complete', time: '3 hours ago', icon: <Terminal size={16} className="text-green-400" /> },
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch("http://localhost:5000/api/tasks")
    .then(res => res.json())
    .then(data => setTasks(data));
  }, []);

  const toggleTask = async(id) => {
    const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: "PATCH"
    });
    //update backend 
    const updatedTask = await res.json();
    setTasks(tasks.map(t=>
      t.id == id ? updatedTask : t
    ));

  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Brain size={24} />
          </div>
          <h1>AI Hub</h1>
        </div>
        
        <nav className="nav-menu">
          <a href="#" className="nav-item active">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          <a href="#" className="nav-item">
            <CheckSquare size={20} />
            <span>Tasks & Priorities</span>
          </a>
          <a href="#" className="nav-item">
            <Mail size={20} />
            <span>Smart Inbox</span>
          </a>
          <a href="#" className="nav-item">
            <MessageSquare size={20} />
            <span>Telegram Bot</span>
          </a>
          <a href="#" className="nav-item">
            <Network size={20} />
            <span>n8n Workflows</span>
          </a>
        </nav>
        
        <div className="mt-auto pt-8">
          <a href="#" className="nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="search-bar">
            <Search size={18} className="text-secondary" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Ask AI or search historical emails, tasks, notes (FAISS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Command size={16} className="text-secondary" />
          </div>
          
          <div className="header-actions">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="badge">3</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 border-2 border-slate-800 cursor-pointer"></div>
          </div>
        </header>

        <div className="dashboard-scroll">
          <div className="animate-fade-in">
            <h2 className="text-2xl font-semibold mb-1">Good Morning, Alex</h2>
            <p className="text-secondary mb-6">Here is your AI-curated daily brief and task priorities.</p>
            
            <div className="stats-grid">
              <div className="stat-card glass purple">
                <div className="stat-header">
                  <span className="stat-title">Productivity Score</span>
                  <div className="stat-icon"><Zap size={20} /></div>
                </div>
                <div className="stat-value">94<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/100</span></div>
                <div className="stat-trend up">
                  <TrendingUp size={16} />
                  <span>+12% from yesterday</span>
                </div>
              </div>
              
              <div className="stat-card glass blue">
                <div className="stat-header">
                  <span className="stat-title">Tasks Completed</span>
                  <div className="stat-icon"><CheckSquare size={20} /></div>
                </div>
                <div className="stat-value">12</div>
                <div className="stat-trend up">
                  <TrendingUp size={16} />
                  <span>+3 this morning</span>
                </div>
              </div>
              
              <div className="stat-card glass green">
                <div className="stat-header">
                  <span className="stat-title">Emails Processed</span>
                  <div className="stat-icon"><Mail size={20} /></div>
                </div>
                <div className="stat-value">48</div>
                <div className="stat-trend">
                  <span style={{color: 'var(--text-secondary)'}}>Automated by n8n</span>
                </div>
              </div>
              
              <div className="stat-card glass orange">
                <div className="stat-header">
                  <span className="stat-title">High Priority</span>
                  <div className="stat-icon"><Clock size={20} /></div>
                </div>
                <div className="stat-value">2</div>
                <div className="stat-trend down">
                  <span>Needs attention soon</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-grid animate-fade-in delay-1">
            <div className="panel glass">
              <div className="panel-header">
                <h3 className="panel-title">
                  <TrendingUp size={20} className="text-accent-primary" />
                  Productivity Analytics
                </h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={productivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.9)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel glass">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Activity size={20} className="text-accent-secondary" />
                  System Activity
                </h3>
              </div>
              <div className="activity-list">
                {activityLog.map(log => (
                  <div key={log.id} className="activity-item">
                    <div className="activity-icon">
                      {log.icon}
                    </div>
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
              <h3 className="panel-title">
                <Brain size={20} className="text-accent-primary" />
                AI-Prioritized Tasks
              </h3>
              <button className="btn-primary">
                <Zap size={16} />
                Run Workflow
              </button>
            </div>
            
            <div className="task-list">
              {tasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'opacity-50' : ''}`}>
                  <div className="task-content">
                    <div 
                      className={`task-checkbox ${task.completed ? 'completed' : ''}`}
                      onClick={() => toggleTask(task.id)}
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
