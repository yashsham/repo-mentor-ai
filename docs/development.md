# RepoMentor AI — Developer Setup Guide

This guide describes how to set up, run, and test RepoMentor AI locally.

## Prerequisites

- **Node.js**: `v20.x` or later (tested on `v24.x`)
- **npm** or **pnpm**: `npm v10+` or `pnpm v9+`
- **Python**: `3.11+` (tested on `Python 3.13.5`)
- **Git**: Installed and accessible on your PATH

---

## 1. Environment Setup

Clone the repository and copy the environment template:

```bash
cp .env.example .env
```

Review `.env` to customize host or port bindings if necessary. The default configuration connects the local Next.js frontend (`http://localhost:3000`) with the FastAPI backend (`http://127.0.0.1:8000`).

---

## 2. Backend Service (`services/api`)

### Installation

Navigate to `services/api` and set up a Python virtual environment:

```bash
# From root directory:
cd services/api

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Running the API Server

```bash
# Inside services/api with virtualenv activated:
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify that the backend is running by checking the health endpoint:
```bash
curl http://127.0.0.1:8000/api/v1/health
```

Expected JSON response:
```json
{
  "status": "ok",
  "service": "repo-mentor-api",
  "version": "0.1.0",
  "timestamp": "2026-..."
}
```

Interactive OpenAPI documentation is available at:
`http://127.0.0.1:8000/docs`

### Running Backend Tests

```bash
cd services/api
pytest -v
```

---

## 3. Frontend Web App (`apps/web`)

### Installation

```bash
cd apps/web
npm install
```

### Running the Frontend Development Server

```bash
cd apps/web
npm run dev
```

Open `http://localhost:3000` in your browser.

### Running Frontend Tests & Type Checking

```bash
cd apps/web
# Run Vitest unit tests:
npm test

# Run TypeScript type check:
npm run typecheck

# Build production bundle:
npm run build
```

---

## 4. Root Convenience Commands

From the repository root:
- `npm run dev:web` — Start Next.js development server
- `npm run test:web` — Run frontend tests
- `make dev-backend` — Start backend server
- `make dev-frontend` — Start frontend server
- `make test` — Run all test suites
