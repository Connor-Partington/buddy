# DocFox

A lightweight local VS Code companion for Markdown copyediting workflows.

## Development

Install dependencies, compile the extension, then press `F5` in VS Code to open an Extension Development Host.

```bash
npm install
npm run compile
```

For local installs, bump the patch version before packaging and use the matching VSIX filename:

```bash
npm version patch --no-git-tag-version
npx --yes @vscode/vsce package --out docfox-<version>.vsix
'/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' --install-extension docfox-<version>.vsix --force
```

The extension currently contributes a DocFox Activity Bar container with a sidebar webview. The sidebar renders a CSS placeholder fox so the UI can be developed before final animation assets exist.

DocFox has an extension-side state manager and webview message handling for `idle`, `typing`, `searching`, `thinking`, `sleeping`, and `happy`. Use `DocFox: Preview Animations` from the Command Palette to cycle through the CSS character states, or use the `DocFox: Set State ...` commands to preview one state at a time.

When Markdown documents change, DocFox switches to `typing`, moves to `thinking` after 1 second of quiet, then moves to `sleeping` after another 5.5 seconds. Clicking around a Markdown file switches DocFox to `searching` before returning to the idle flow.
