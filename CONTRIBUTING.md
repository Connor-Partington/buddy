# Contributing to Buddy

Thanks for wanting to help with Buddy.

## How to Contribute

1. Open an issue for bugs, feature ideas, or behavior changes.
2. Fork the repository and create a focused branch.
3. Run the checks locally before opening a pull request:

```bash
npm run compile
npm run package
```

4. Open a pull request against `main`.

All changes need review and approval before they are merged.

## Development

Install dependencies:

```bash
npm install
```

Run the extension in a VS Code Extension Development Host:

```text
Press F5 in VS Code
```

Package a local VSIX:

```bash
npm run package
```

## Scope

Buddy is local-first. Contributions should preserve that expectation: no telemetry, no source-code upload, and no required external account or service.
