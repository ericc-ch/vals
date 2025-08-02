# AGENTS.md

## Build, Lint, and Test
- Use Deno for all commands:
  - Run all tests: `deno test`
  - Run a single test: `deno test --filter <name>`
  - Lint: `deno lint`
  - Format: `deno fmt`
- No Node.js or npm scripts; use Deno CLI only.

## Code Style Guidelines
- Write TypeScript/TSX with explicit types and interfaces for all data.
- Use ES6+ imports, always pin dependency versions (e.g., `https://esm.sh/hono@4.6.12`).
- Prefer official SDKs/libraries over raw API calls.
- Never hardcode secrets; use environment variables.
- Let errors bubble up unless a local resolution is possible; avoid catch blocks that just log or return 500s.
- Add comments for complex logic, not for obvious code.
- Use functional programming and modern conventions.
- For React, always pin to 18.2.0 and use `@jsxImportSource` pragma.
- Follow Val Town platform rules: avoid Node.js/Deno-only APIs in shared code, use provided utilities for file/storage, and serve static assets via helpers.
- Ask clarifying questions if requirements are ambiguous and test edge cases before finalizing code.

(See .cursorrules for full details.)
