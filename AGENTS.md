# Agent Instructions

These notes capture recurring Buddy repo workflow preferences for coding agents.

## Project Workflow

- Keep changes focused on the requested feature or fix.
- Preserve Buddy's local-first behavior: no telemetry, no source upload, and no required external service.
- Update `README.md` when user-facing commands, behavior, setup, or feature descriptions change.
- Update `CHANGELOG.md` for notable user-facing changes, especially before release or packaging work.
- Run `npm run compile` and `npm run lint` before reporting feature work as complete.
- Do not commit automatically when a feature is first implemented. Wait until Connor accepts the feature or explicitly asks for a commit.
- When asked to commit, make focused commits with clear imperative messages.
- If a change adds commands, update both `package.json` contributions and README command documentation.
- Use semantic versioning going forward. For user-facing features, prefer a minor version bump; for bug fixes, prefer a patch bump; for breaking behavior or API changes, use a major bump once the project is past `1.0.0`.

## Token Efficiency

- Be token-efficient by default: inspect only files and symbols directly relevant to the request, and use targeted `rg` searches before broader exploration.
- Keep progress updates and final summaries concise unless Connor asks for deeper explanation.
- Prefer the smallest safe change that matches the existing codebase; avoid unrelated refactors, broad file reads, and long code explanations.
- Ask before reading large files, running broad audits, or expanding the task beyond the named scope when the next step is not clearly necessary.
- If verification is expensive or exploratory, mention the tradeoff and wait for direction unless completion requires the standard `npm run compile` and `npm run lint` checks.

## Extension Notes

- Webview UI and animation behavior live primarily in `src/Provider.ts`.
- VS Code command registration lives in `src/extension.ts`.
- Long-lived/persisted companion state should live outside the webview and sync into the panel by message.
- Sprite assets live in `assets/images`; prefer using the existing trimmed GIF rendering path for Buddy animation states.
- Keep generated package artifacts such as `.vsix` files out of unrelated commits unless the user asks for packaging.

## Release Workflow

- Before release, choose the next version with semantic versioning, then update `package.json`, `package-lock.json`, README version references, and `CHANGELOG.md`.
- Run `npm run compile`, `npm run lint`, and usually `npm run package` before publishing.
- Commit the release prep changes, then push `main`:

```bash
git push origin main
```

- Trigger the GitHub release workflow by creating and pushing a version tag that matches `v*.*.*`:

```bash
git tag v0.0.32
git push origin v0.0.32
```

- The `.github/workflows/release.yml` workflow packages the extension and creates a GitHub release with the generated `.vsix`.
- The release workflow can also be started manually from GitHub Actions via `workflow_dispatch`.
- Do not run release pushes or tags unless explicitly asked for a release.
