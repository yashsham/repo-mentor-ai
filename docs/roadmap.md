# RepoMentor AI — Implementation Roadmap

This roadmap defines the implementation phases from initial foundation to production readiness.

| Phase | Milestone | Status | Key Deliverables |
|---|---|---|---|
| **Phase 0** | Workspace Discovery | **Completed** | Toolchain audit, Git repository initialization, environment validation. |
| **Phase 1** | Project Foundation | **Completed** | Monorepo scaffolding, minimal FastAPI backend with health check, Next.js App Router landing page, URL validation tests, documentation. |
| **Phase 2** | Vertical MVP | **Completed** | Public GitHub URL ingestion, commit SHA pinning, hierarchical file tree extraction, live source file viewing with line numbers and binary filtering. |
| **Phase 3** | Code Intelligence | **Completed** | Tree-sitter AST parser (Python, TS/JS), symbol extraction (classes, functions, imports), dependency graph generation, interactive graph & symbol viewer. |
| **Phase 4** | AI Understanding & Retrieval | *In Progress* | Replaceable LLM provider adapter (Ollama/cloud), local vector chunk retrieval, source-grounded file and symbol Q&A with exact line-number citations. |
| **Phase 5** | Teaching Interface | *Upcoming* | Full 3-panel learning layout, React Flow architecture graph, code-to-diagram linking, structured progressive curriculum. |
| **Phase 6** | Voice & Avatar | *Upcoming* | Replaceable TTS interface (Piper/Kokoro/WebSpeech), audio streaming, synchronized 2D/3D avatar states (idle/listening/speaking), interrupt controls. |
| **Phase 7** | Production Readiness | *Upcoming* | SSRF hardening, rate limiting, structured telemetry, end-to-end Playwright tests, CI/CD workflows, deployment blueprints. |

---

## Acceptance Criteria by Phase

### Phase 1 (Completed)
- Monorepo structure configured with `apps/web`, `services/api`, `packages/shared-types`, `docs/`.
- FastAPI backend serving `GET /api/v1/health` with Pydantic validation.
- Next.js landing page with responsive developer-tool UI, repository URL input, and clear Milestone 1 preview banner.
- Unit tests for backend health check (`pytest`) and frontend URL validation (`vitest`).
- Documented developer setup with zero hardcoded secrets.

### Phase 2 (Completed)
- Ingestion of public GitHub repositories using standard HTTPS URLs (`github.com/{owner}/{repo}`).
- Commit SHA pinning via GitHub Trees API (`HEAD` of default branch) for reproducible analyses.
- Recursive hierarchical file tree representation with binary file filtering.
- Source file retrieval API and frontend `CodeViewer` with syntax styling and line numbers.

### Phase 3 (Completed)
- Deterministic static AST parsing for Python and TypeScript/JavaScript using Tree-sitter.
- Comprehensive symbol extraction: classes, functions, methods, parameters, types, docstrings, imports, and syntax error tracking.
- Static dependency graph generation linking cross-file module and symbol imports with in/out degrees and entry point detection.
- Fast analysis REST endpoints: `POST /api/v1/analysis/file`, `GET /api/v1/analysis/repositories/{owner}/{repo}/files/{path}`, and `GET /api/v1/analysis/repositories/{owner}/{repo}/graph`.
- Interactive frontend `ArchitectureGraph` view and `CodeViewer` AST symbols quick bar with line navigation and syntax alerts.
- Fully verified with 18 backend tests (`pytest`) and 24 frontend tests (`vitest`).
