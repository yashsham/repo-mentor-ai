# Contributing to RepoMentor AI

Thank you for your interest in contributing to **RepoMentor AI**! We are committed to building an open-source-first platform that helps engineers deeply understand complex software repositories through source-grounded code intelligence, interactive architectures, and technical AI tutoring.

## Code of Conduct

Please maintain a collaborative, welcoming, and technically rigorous environment. Treat all contributors with respect.

## Architectural Principles

Before submitting code, review our core architectural rules in [`docs/architecture.md`](docs/architecture.md):
1. **Never treat external repository code as trusted input.** Code is statically parsed, never executed during ingestion.
2. **Deterministic grounds before inferences:** Always prioritize AST symbols and file dependencies over model hallucinations.
3. **Pin commit SHAs:** All cache keys and analysis artifacts must map to an immutable commit SHA.
4. **Clean boundary interfaces:** Keep LLMs, vector search, and TTS engines behind interchangeable provider abstractions.

## Development Setup

See [`docs/development.md`](docs/development.md) for full instructions:
- **Frontend**: Node.js v20+, Next.js (App Router), TypeScript strict mode, Tailwind CSS.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Pytest.

## Pull Request Guidelines

1. Ensure all tests pass:
   - Backend: `pytest`
   - Frontend: `npm test` and `npm run build`
2. Follow strict TypeScript and Python typing (no bare `Any` without justification).
3. For architectural changes or new third-party integrations, add an Architecture Decision Record (ADR) under `docs/decisions/`.
