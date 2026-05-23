# DocFox

A lightweight local VS Code companion for Markdown copyediting workflows.

## Development

Install dependencies, compile the extension, then press `F5` in VS Code to open an Extension Development Host.

```bash
npm install
npm run compile
```

The extension currently contributes a DocFox Activity Bar container with a sidebar webview. The sidebar renders a CSS placeholder fox so the UI can be developed before final animation assets exist.

DocFox has an extension-side state manager and webview message handling for `idle`, `typing`, `thinking`, `sleeping`, and `happy`. Use the `DocFox: Set State ...` commands from the Command Palette to preview each state before typing detection is wired in.

Typing detection and idle timers are next.
