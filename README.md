# AI Personal Intelligence Hub

> Full-stack AI-powered productivity system with RAG, semantic search, workflow automation, and hybrid task scoring.

**Stack:** React · Node.js (Express) · MongoDB · n8n · Gemini API · FAISS (vector search)

---

## Features

- **RAG Pipeline** — emails ingested via n8n, summarised + task-extracted with Gemini, embedded and indexed for semantic retrieval
- **Semantic Search** — FAISS-backed vector search across emails, notes, and tasks using `text-embedding-004`
- **Hybrid Priority Scoring** — rule-based heuristics + LLM urgency classification combine into a single task score (0–100)
- **n8n Automation** — pluggable workflow pipelines for email ingestion and data processing
- **Notes** — create and search notes; auto-embedded on save

---

## Architecture

```
React Frontend  ──REST──►  Express Backend  ──►  Gemini API (LLM + Embeddings)
                                │
                     ┌──────────┼──────────┐
                  MongoDB    FAISS Index   n8n Pipelines
                 (data)      (vectors)    (automation)
```

---

## Quick Start

### 1. Prerequisites
- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### 2. Start infrastructure
```bash
docker compose up -d
```
This starts MongoDB on port `27017` and n8n on port `5678`.

### 3. Configure environment
```bash
cd backend
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY
```

### 4. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 5. Run dev servers
```bash
# Backend (from /backend)
npm run dev

# Frontend (from /frontend, in a separate terminal)
npm run dev
```

Frontend → http://localhost:5173  
Backend → http://localhost:5000  
n8n UI → http://localhost:5678

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/ai-hub` |
| `GEMINI_API_KEY` | Google Gemini API key | *(required)* |
| `LLM_PROVIDER` | `gemini` or `openai` | `gemini` |
| `N8N_WEBHOOK_URL` | n8n webhook base URL | `http://localhost:5678/webhook` |
| `N8N_AUTH_HEADER` | Bearer token for n8n auth (optional) | *(empty = open)* |

---

## API Reference

### Tasks
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tasks` | List all tasks (auto-scored) |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/:id` | Toggle completion, or edit title/description/deadline/category |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `POST` | `/api/tasks/rescore` | Rescore all open tasks |

### Emails
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/emails` | List emails (no body/embedding) |
| `GET` | `/api/emails/:id` | Full email with summary + extracted tasks |
| `DELETE` | `/api/emails/:id` | Delete email |

### Notes
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notes` | List notes, optional `?tag=` filter |
| `POST` | `/api/notes` | Create note (auto-embedded) |
| `PATCH` | `/api/notes/:id` | Update note (re-embedded) |
| `DELETE` | `/api/notes/:id` | Delete note |

### AI
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/search` | Semantic search (FAISS) |
| `POST` | `/api/ai/score-task` | Score a task without persisting |
| `POST` | `/api/ai/summarize` | Summarise text |
| `POST` | `/api/ai/extract-tasks` | Extract tasks from text |
| `POST` | `/api/ai/classify-urgency` | LLM urgency classification |
| `POST` | `/api/ai/daily-brief` | Generate daily AI brief |

### n8n Webhooks (inbound from n8n)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/n8n/ingest-email` | Receive email from n8n → process with AI |
| `POST` | `/api/n8n/ingest-task` | Receive pre-extracted task |
| `POST` | `/api/n8n/trigger` | Trigger an n8n workflow |

---

## n8n Workflow Setup

1. Open n8n at http://localhost:5678
2. Go to **Workflows → Import from file** and import both:
   - `n8n/workflows/email-ingest.json`
   - `n8n/workflows/process.json`
3. Set your Gmail credentials in the **Fetch Unread Gmail** node
4. Activate both workflows (the backend triggers them through the production webhook URLs, so they have to be active)

The workflows call the backend at `host.docker.internal:5000` since n8n runs in docker. If your backend runs elsewhere, change the URL in the HTTP Request nodes.

**Email Ingest**: runs every 15 min (or when the backend hits `/webhook/email-ingest`), fetches unread Gmail, POSTs them in a batch to `POST /api/n8n/ingest-email`. Backend summarises, extracts tasks, embeds and stores everything.

**Process Pipeline**: hit via `/webhook/process`, rescores all open tasks (`POST /api/tasks/rescore`) then generates a daily brief (`POST /api/ai/daily-brief`).

---

## Testing

```bash
docker compose up -d mongo      # tests only need Mongo, not n8n
cd backend && npm test
```

Route tests run the real routers against a throwaway database (`ai-hub-test-<pid>-<ts>`) with a fake LLM, so no API keys are needed. To use a different Mongo, set `MONGO_TEST_URI=mongodb://host:27017`. The frontend is checked with `npm run lint` and `npm run build`; CI runs all of this on every PR.

---

## Project Structure

```
personal-intelligence-hub/
├── backend/
│   ├── src/
│   │   ├── config/       # DB connection
│   │   ├── models/       # Mongoose schemas (Task, Email, Note, Activity, DailyBrief)
│   │   ├── routes/       # Express route handlers
│   │   ├── services/
│   │   │   ├── llm/      # LLM provider abstraction (Gemini / OpenAI)
│   │   │   ├── ai.service.js          # scoring, summarisation, extraction
│   │   │   ├── faiss.service.js       # vector index (cosine similarity)
│   │   │   ├── orchestrator.service.js # email pipeline
│   │   │   └── n8n.service.js         # n8n communication
│   │   └── app.js
│   └── faiss_store/      # persisted vector index (git-ignored)
├── frontend/
│   └── src/
│       ├── pages/        # Dashboard, Inbox, Notes, Workflows
│       ├── api.js        # fetch helpers
│       └── App.jsx       # routing + search modal
├── n8n/workflows/        # importable n8n workflow JSON files
├── docker-compose.yml
└── README.md
```
