# RepoMentor AI — Security Policy & Threat Model

## 1. Threat Model & Boundaries

RepoMentor AI ingests and analyzes source code from third-party repositories. Because third-party source code is inherently untrusted, we adopt strict defense-in-depth principles:

### Untrusted Code Execution
- **Policy**: Code from external repositories is **never** executed (`eval`, `exec`, runtime imports, or invoking user build scripts are prohibited).
- **Enforcement**: Analysis is purely static using AST parsers (such as Tree-sitter) operating on string tokens without compiling or loading code into the runtime environment.

### Server-Side Request Forgery (SSRF)
- **Policy**: Ingestion requests are strictly constrained to public GitHub endpoints.
- **Enforcement**:
  - URLs are validated against `^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\.git)?$` before processing.
  - Resolved IP addresses are checked against private RFC1918 blocks, link-local addresses (`169.254.0.0/16`), loopback (`127.0.0.0/8`), and cloud metadata endpoints (`169.254.169.254`).
  - Redirects are validated before being followed.

### Denial of Service (DoS) and Resource Exhaustion
- **Max File Limit**: Maximum 5,000 files per analyzed repository.
- **Max File Size**: Individual files exceeding 1 MB are ignored for deep parsing.
- **Execution Timeouts**: Ingestion and parsing operations are bound by hard timeouts (e.g. 60 seconds) with cancelable tasks.

### Credential Handling & Data Privacy
- **No Secret Persistence**: Personal Access Tokens (PATs) are never logged, stored in plain text, or sent in client telemetry.
- **Ephemeral Storage**: Ingested repository content is stored in ephemeral or bounded cache storage with documented TTLs.
