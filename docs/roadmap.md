# RepoMentor AI — Implementation Roadmap

This roadmap defines the implementation phases from initial foundation to production readiness.

| Phase | Milestone | Status | Key Deliverables |
|---|---|---|---|
| **Phase 0** | Workspace Discovery | **Completed** | Toolchain audit, Git repository initialization, environment validation. |
| **Phase 1** | Project Foundation | **Completed** | Monorepo scaffolding, minimal FastAPI backend with health check, Next.js App Router landing page, URL validation tests, documentation. |
| **Phase 2** | Vertical MVP | **Completed** | Public GitHub URL ingestion, commit SHA pinning, hierarchical file tree extraction, live source file viewing with line numbers and binary filtering. |
| **Phase 3** | Code Intelligence | *Upcoming* | Tree-sitter AST parser (Python, TS/JS), symbol extraction (classes, functions, imports), dependency graph generation. |
| **Phase 4** | AI Understanding & Retrieval | *Upcoming* | Replaceable LLM provider adapter (Ollama/cloud), FAISS/vector chunk retrieval, source-grounded file and symbol Q&A with line-number citations. |
| **Phase 5** | Teaching Interface | *Upcoming* | Full 3-panel learning layout, React Flow architecture graph, code-to-diagram linking, structured progressive curriculum. |
| **Phase 6** | Voice & Avatar | *Upcoming* | Replaceable TTS interface (Piper/Kokoro/WebSpeech), audio streaming, synchronized 2D/3D avatar states (idle/listening/speaking), interrupt controls. |
| **Phase 7** | Production Readiness | *Upcoming* | SSRF hardening, rate limiting, structured telemetry, end-to-end Playwright tests, CI/CD workflows, deployment blueprints. |

---

## Acceptance Criteria by Phase

### Phase 1 (Current)
- Monorepo structure configured with `apps/web`, `services/api`, `packages/shared-types`, `docs/`.
- FastAPI backend serving `GET /api/v1/health` with Pydantic validation.
- Next.js landing page with responsive developer-tool UI, repository URL input, and clear Milestone 1 preview banner.
- Unit tests for backend health check (`pytest`) and frontend URL validation (`vitest`).
- Documented developer setup with zero hardcoded secrets.
