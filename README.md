# Luna

Luna is a lightweight local VS Code sidebar companion for Markdown copyediting workflows.

The extension still uses the internal package/command prefix `docfox` so VS Code updates the same installed extension, but the user-facing companion name is **Luna**.

## Current Status

- VS Code extension scaffold is complete.
- Luna contributes an Activity Bar container and sidebar webview.
- The webview supports two visual modes:
  - CSS fallback character.
  - PNG frame animation mode from `assets/images`.
- Frame mode is optional and can be toggled from the sidebar or Command Palette.
- Frame PNGs are loaded dynamically from disk, so non-contiguous frame numbers are allowed.
- Green-screen chroma keying runs in the webview canvas at runtime.
- Sounds are optional, off by default, and generated with Web Audio.
- Current packaged version: `0.0.14`.

## Behavior

Luna has these states:

- `idle`
- `typing`
- `searching`
- `thinking`
- `sleeping`
- `happy`
- `panic`

Markdown typing flow:

```text
typing -> 1s quiet -> thinking -> 5.5s quiet -> sleeping
```

Clicking around a Markdown file triggers `searching`.

When the active Markdown file has VS Code error diagnostics, Luna switches to `panic`.

## Commands

- `Luna: Preview Animations`
- `Luna: Show Sidebar`
- `Luna: Toggle Sounds`
- `Luna: Toggle Frame Animations`
- `Luna: Set State Idle`
- `Luna: Set State Typing`
- `Luna: Set State Searching`
- `Luna: Set State Thinking`
- `Luna: Set State Sleeping`
- `Luna: Set State Happy`
- `Luna: Set State Panic`

## Frame Assets

Frame assets live under:

```text
assets/images/
├── fox-frames-idle/
├── fox-frames-looking/
├── fox-frames-panic/
├── fox-frames-sleeping/
└── fox-frames-thinking/
```

State mapping:

```text
idle      -> fox-frames-idle
typing    -> fox-frames-looking
searching -> fox-frames-looking
thinking  -> fox-frames-thinking
sleeping  -> fox-frames-sleeping
happy     -> fox-frames-idle
panic     -> fox-frames-panic
```

Frame filenames must match `frame_*.png`. They do not need to be contiguous; the extension reads existing frame files and sorts them by number.

The current frame player uses:

```text
frameDurationMs = 160
frameHoldCount = 2
```

That means each source frame is held for roughly `320ms`.

## Development

Install dependencies and compile:

```bash
npm install
npm run compile
```

Run in the Extension Development Host:

```text
Press F5 in VS Code
```

## Local Install Workflow

For local installs, bump the patch version before packaging and use the matching VSIX filename:

```bash
npm version patch --no-git-tag-version
npx --yes @vscode/vsce package --out docfox-<version>.vsix
'/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' --install-extension docfox-<version>.vsix --force
```

Keep only the current VSIX in the project root. Older VSIX files are ignored by git and can be removed after installing the newest version.

After install, run this in VS Code if the UI does not update immediately:

```text
Developer: Reload Window
```

## Notes For Next Handoff

- The current source of truth is the latest git commit in this repository.
- `docfox-0.0.14.vsix` is the current local package.
- The CSS fallback remains useful for comparison because it feels smoother than frame mode.
- Frame mode quality depends heavily on the source PNGs and the green-screen edges.
- Chroma keying happens in `src/DocFoxProvider.ts` inside `getProcessedFrame()`.
- Frame timing and hold behavior are in the webview script in `src/DocFoxProvider.ts`.
