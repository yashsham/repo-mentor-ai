# RepoMentor AI

> An extensible, source-grounded code intelligence and interactive learning mentor for developers.

RepoMentor AI helps engineers deeply understand complex, unfamiliar codebases. It combines deterministic static code analysis (Tree-sitter AST and dependency graphs) with source-grounded AI tutoring, architecture visualization, and an interactive teaching interface.

---

## Workspace Layout Preview

RepoMentor AI provides a three-panel developer experience:

```
+---------------------+-----------------------------------+------------------------+
| 1. LEFT SIDEBAR     | 2. CENTER WORKSPACE               | 3. RIGHT TEACHING      |
|---------------------|-----------------------------------|------------------------|
| - Repository Tree   | - Selected Source Code & Syntax   | - AI Tutor Avatar      |
| - Symbol Search     | - Execution Flow Visualization    | - Spoken / Text Mentor |
| - Module Categories | - Interactive Architecture Graph  | - Follow-up Q&A        |
| - Learning Progress | - Exact File & Line Citations     | - Voice Controls       |
+---------------------+-----------------------------------+------------------------+
```

---

## Project Structure

```
repo-mentor-ai/
├── apps/
│   └── web/                   # Next.js App Router, React, TypeScript, Tailwind CSS
├── services/
│   └── api/                   # Python FastAPI service, AST analysis, retrieval engine
├── packages/
│   └── shared-types/          # Shared type contracts and schemas
├── docs/                      # Architecture, development guides, and ADRs
├── scripts/                   # Local automation scripts
├── .env.example               # Safe environment variable placeholders
├── Makefile                   # Reproducible development commands
└── README.md
```

---

## Quickstart

### Prerequisites
- Node.js 20+
- Python 3.11+ (Python 3.13 supported)

### 1. Backend Service (`services/api`)

```bash
cd services/api
python -m venv .venv

# On Windows:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Health Check: `http://127.0.0.1:8000/api/v1/health`  
Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Application (`apps/web`)

```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Testing

Run backend tests:
```bash
cd services/api
pytest -v
```

Run frontend tests:
```bash
cd apps/web
npm test
```

---

## Documentation

- [Architecture & Design Principles](docs/architecture.md)
- [Developer Setup & Workflow](docs/development.md)
- [Roadmap & Milestone Status](docs/roadmap.md)
- [Security & Threat Model](docs/security.md)
- [Architecture Decisions (ADRs)](docs/decisions/)

---

## License

This project is licensed under the [Apache-2.0 License](LICENSE).
