# 1. Monorepo Scaffolding and Initial Technology Stack

Date: 2026-10-22  
Status: Accepted

## Context

RepoMentor AI requires a cohesive platform combining a rich, responsive browser workspace (file tree, syntax-highlighted editor, architecture diagrams, voice tutor) with a high-performance backend capable of static AST parsing, graph computation, and vector retrieval.

## Decision

1. **Monorepo Structure**:
   - `apps/web`: Next.js (App Router), TypeScript (strict mode), Tailwind CSS, Vitest.
   - `services/api`: Python 3.11+, FastAPI, Pydantic v2, Pytest.
   - `packages/shared-types`: Common API schemas and data contracts.
   - `docs/`: Centralized architecture, security, and developer specifications.

2. **Frontend Framework**:
   Next.js App Router chosen for modern React server/client component separation, robust routing, and clean bundle optimization.

3. **Backend Framework**:
   FastAPI chosen for async throughput, built-in OpenAPI documentation, Pydantic type validation, and direct access to Python's rich ecosystem of AST (Tree-sitter) and AI/vector tooling (FAISS, PyTorch, Ollama).

4. **Testing Strategy**:
   - Backend: `pytest` with `httpx` test client for deterministic endpoint and unit testing.
   - Frontend: `vitest` with `@testing-library/react` for fast, lightweight component and utility verification.

## Consequences

- Clear boundary separation prevents code leakage between presentation and compute engines.
- Developers can run either service independently or together using root scripts and `Makefile`.
