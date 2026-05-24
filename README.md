# Luna

Luna is a lightweight local VS Code sidebar companion for Markdown copyediting workflows.

The extension still uses the internal package/command prefix `docfox` so VS Code updates the same installed extension, but the user-facing companion name is **Luna**.

## Current Status

- VS Code extension scaffold is complete.
- Luna contributes an Activity Bar container and sidebar webview.
- The webview supports two visual modes:
  - CSS fallback character.
  - PNG frame animation mode from `assets/images`.
- Frame mode is enabled by default for fresh installs and can be toggled from the sidebar or Command Palette.
- Frame PNGs are loaded dynamically from disk, so non-contiguous frame numbers are allowed.
- Green-screen chroma keying runs in the webview canvas at runtime.
- Sounds are optional, off by default, and generated with Web Audio.
- Current packaged version: `0.0.16`.

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
├── blob-frames-fireworks/
├── blob-frames-idle/
├── blob-frames-jump/
├── blob-frames-search/
├── blob-frames-sleep/
└── blob-frames-walk/
```

State mapping:

```text
idle      -> blob-frames-idle
typing    -> blob-frames-jump
searching -> blob-frames-walk
thinking  -> blob-frames-search
sleeping  -> blob-frames-sleep
happy     -> blob-frames-fireworks
panic     -> blob-frames-jump
```

Frame filenames may match `generated-*.png`, `frame_*.png`, or `pixel-snapper-*-r*c*.png`. They do not need to be contiguous; the extension reads existing frame files and sorts them by trailing number or row/column position.

The Blob walking frame set is used for `searching` and moves Luna left across the sidebar stage while the frames loop.

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

For local installs, use the helper script. It bumps the patch version, compiles, packages a matching VSIX, installs it into VS Code, and removes older `docfox-*.vsix` packages:

```bash
npm run install:local
```

If the VS Code CLI is not in the standard macOS app location or on `PATH`, pass it explicitly:

```bash
CODE_BIN="/path/to/code" npm run install:local
```

After install, run this in VS Code if the UI does not update immediately:

```text
Developer: Reload Window
```

## Notes For Next Handoff

- The current source of truth is the latest git commit in this repository.
- `docfox-0.0.16.vsix` is the current local package.
- The CSS fallback remains useful for comparison because it feels smoother than frame mode.
- Frame mode quality depends heavily on the source PNGs and the green-screen edges.
- Chroma keying happens in `src/DocFoxProvider.ts` inside `getProcessedFrame()`.
- Frame timing and hold behavior are in the webview script in `src/DocFoxProvider.ts`.
