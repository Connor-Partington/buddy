# DocFox

A lightweight local VS Code companion for Markdown copyediting workflows.

## Development

Install dependencies, compile the extension, then press `F5` in VS Code to open an Extension Development Host.

```bash
npm install
npm run compile
```

The extension currently contributes a DocFox Activity Bar container with a sidebar webview. The sidebar renders a CSS placeholder fox so the UI can be developed before final animation assets exist.

DocFox has an extension-side state manager and webview message handling for `idle`, `typing`, `thinking`, `sleeping`, and `happy`. Use the `DocFox: Set State ...` commands from the Command Palette to preview each state.

When Markdown documents change, DocFox switches to `typing`, moves to `thinking` after 1 second of quiet, then moves to `sleeping` after another 2.5 seconds.
