.PHONY: help install dev test test-backend test-frontend build lint clean

help:
	@echo "RepoMentor AI - Developer Commands"
	@echo "=================================="
	@echo "make install       - Install frontend and backend dependencies"
	@echo "make dev           - Start backend and frontend development servers"
	@echo "make dev-backend   - Start FastAPI backend server (http://127.0.0.1:8000)"
	@echo "make dev-frontend  - Start Next.js frontend server (http://localhost:3000)"
	@echo "make test          - Run all backend and frontend tests"
	@echo "make test-backend  - Run backend pytest tests"
	@echo "make test-frontend - Run frontend vitest tests"
	@echo "make build         - Build frontend production bundle"
	@echo "make lint          - Run linters across codebase"
	@echo "make clean         - Remove cache files and build artifacts"

install:
	cd apps/web && npm install
	cd services/api && python -m pip install -r requirements.txt

dev-backend:
	cd services/api && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

dev-frontend:
	cd apps/web && npm run dev

test-backend:
	cd services/api && pytest -v

test-frontend:
	cd apps/web && npm test

test: test-backend test-frontend

build:
	cd apps/web && npm run build

clean:
	rm -rf apps/web/.next apps/web/out apps/web/node_modules
	rm -rf services/api/.pytest_cache services/api/__pycache__
