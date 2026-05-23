# Luna MVP Checklist

A lightweight VS Code companion for Markdown copyediting workflows.

---

# Completed

## Project Setup

- [x] Install Node.js
- [x] Scaffold TypeScript VS Code extension project
- [x] Add `package.json`
- [x] Add `tsconfig.json`
- [x] Add VS Code launch/tasks config
- [x] Initialize git
- [x] Commit scaffold
- [x] Package and install local VSIX builds
- [x] Use patch version bumps for installable changes
- [x] Keep only the current VSIX in the project root
- [x] Add one-command local compile/package/install script

## Sidebar And Webview

- [x] Add Activity Bar container
- [x] Add Luna sidebar view
- [x] Add extension icon
- [x] Create `src/DocFoxProvider.ts`
- [x] Register webview provider
- [x] Render sidebar HTML UI
- [x] Display CSS fallback character
- [x] Add sidebar controls for sounds and frame mode

## State System

- [x] Add state manager
- [x] Add `setState()` flow
- [x] Send messages from extension to webview
- [x] Update displayed animation from state
- [x] Add Command Palette state preview commands

Implemented states:

- [x] `idle`
- [x] `typing`
- [x] `searching`
- [x] `thinking`
- [x] `sleeping`
- [x] `happy`
- [x] `panic`

## Markdown Activity

- [x] Detect Markdown document changes with `vscode.workspace.onDidChangeTextDocument`
- [x] Trigger `typing` on Markdown edits
- [x] Reset timers while typing
- [x] Switch to `thinking` after 1 second of quiet
- [x] Switch to `sleeping` after another 5.5 seconds
- [x] Detect mouse selection changes in Markdown files
- [x] Trigger `searching` when clicking around a Markdown file
- [x] Detect active Markdown error diagnostics
- [x] Trigger `panic` when errors are detected

## Frame Animation Mode

- [x] Add PNG frame assets under `assets/images`
- [x] Add frame mode toggle
- [x] Keep CSS fallback mode available
- [x] Load frame files dynamically from folders
- [x] Support non-contiguous frame numbers after deleting bad frames
- [x] Render frames through canvas
- [x] Add runtime green-screen chroma keying
- [x] Add green spill suppression for edge pixels
- [x] Use `requestAnimationFrame` for frame playback
- [x] Add code-level frame holding instead of duplicating files

Current frame folders:

```text
assets/images/
├── fox-frames-idle/
├── blog-frames-walking/
├── fox-frames-looking/
├── fox-frames-panic/
├── fox-frames-sleeping/
├── fox-frames-thinking/
└── fox-frames-fireworks/
```

Current frame mapping:

```text
idle      -> fox-frames-idle
typing    -> fox-frames-looking
searching -> blog-frames-walking
thinking  -> fox-frames-thinking
sleeping  -> fox-frames-sleeping
happy     -> fox-frames-fireworks
panic     -> fox-frames-panic
```

- [x] Add dedicated walking/searching frames

## Sounds

- [x] Add optional sound toggle
- [x] Keep sounds off by default
- [x] Persist sound preference in VS Code global state
- [x] Generate subtle sounds with Web Audio
- [x] Add `Luna: Toggle Sounds`

## Packaging

- [x] Bump version for each installed VSIX
- [x] Build versioned VSIX files
- [x] Install with VS Code CLI and `--force`
- [x] Remove older ignored VSIX packages after install

Current local package:

```text
docfox-0.0.16.vsix
```

---

# Still To Do

## Verification

- [ ] Reload VS Code and verify Luna appears in the Activity Bar
- [ ] Verify sidebar opens correctly
- [ ] Verify CSS fallback mode still works
- [ ] Verify frame mode works after deleting bad frames
- [ ] Verify chroma key cleanup removes remaining green edge artifacts
- [ ] Verify typing flow: `typing -> thinking -> sleeping`
- [ ] Verify clicking in Markdown triggers `searching`
- [ ] Verify active Markdown errors trigger `panic`
- [ ] Verify `Luna: Preview Animations`
- [ ] Verify sounds toggle and generated sounds

## Markdown Awareness

- [x] Detect `.md`/Markdown documents for typing behavior
- [ ] Decide whether Luna should hide for non-Markdown files
- [ ] If yes, implement non-Markdown hidden/disabled UI state

## Animation Polish

- [ ] Tune frame timing if it still feels too fast or too choppy
- [ ] Tune `frameDurationMs` and `frameHoldCount`
- [ ] Improve chroma key thresholds if green outlines remain
- [ ] Consider pre-processing transparent PNGs if runtime chroma keying is not clean enough
- [ ] Add dedicated typing frames if assets become available
- [x] Add dedicated happy/fireworks frames

## UI Polish

- [x] Apply Space Blue accent `#90D5FF`
- [x] Add rounded sidebar stage
- [x] Add smooth CSS fallback transitions
- [ ] Improve icon affordances/tooltips if needed
- [ ] Confirm layout at narrow sidebar widths

## Optional Features

- [x] Detect save event
- [x] Trigger `happy`/fireworks on save
- [ ] Add reading/no-typing state
- [ ] Add documentation quality mood system
- [ ] Add Git/PR celebration reactions

---

# Handoff Notes

- User-facing name is **Luna**.
- Internal extension/package/command prefix is still `docfox` to avoid installing a duplicate extension.
- Main implementation file is `src/DocFoxProvider.ts`.
- Activity and diagnostics logic lives in `src/activityController.ts`.
- State definitions live in `src/stateManager.ts`.
- Demo cycling lives in `src/demoController.ts`.
- Current installed version should be `0.0.16`.
- Rebuild/reinstall after asset changes because installed VSIX contains a copied asset set.
