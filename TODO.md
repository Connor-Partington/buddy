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
- [x] Create `src/Provider.ts`
- [x] Register webview provider
- [x] Render sidebar HTML UI
- [x] Display CSS fallback character
- [x] Remove visible sidebar controls and status text
- [x] Make the sidebar stage transparent
- [x] Align Luna to the bottom of the stage

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
- [x] Trigger `searching` when clicking around an editor file
- [x] Trigger `searching` when scrolling an editor file
- [x] Detect active Markdown error diagnostics
- [x] Trigger `panic` when errors are detected

## Animated Sprite Mode

- [x] Add animated sprite assets under `assets/images`
- [x] Add animated sprite mode command
- [x] Keep CSS fallback mode available
- [x] Replace PNG frame folders with per-state GIF sprites
- [x] Render GIF sprites directly instead of canvas frames

Current sprite files:

```text
assets/images/
├── happy.gif
├── idle.gif
├── jump.gif
├── search.gif
├── sleep.gif
├── think.gif
└── walk.gif
```

Current sprite mapping:

```text
idle      -> idle.gif
typing    -> think.gif
searching -> search.gif
thinking  -> think.gif
sleeping  -> sleep.gif
happy     -> happy.gif
panic     -> jump.gif
```

- [x] Add dedicated walking/searching sprites
- [x] Replace fox assets with Blob assets

## Sounds

- [x] Add optional sound command
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
docfox-0.0.19.vsix
```

---

# Still To Do

## Verification

- [ ] Reload VS Code and verify Luna appears in the Activity Bar
- [ ] Verify sidebar opens correctly
- [ ] Verify CSS fallback mode still works
- [ ] Verify animated sprite mode loads the GIF for each state
- [ ] Verify typing flow: `typing -> thinking -> sleeping`
- [ ] Verify clicking or scrolling in an editor file triggers `searching`
- [ ] Verify active Markdown errors trigger `panic`
- [ ] Verify `Luna: Preview Animations`
- [ ] Verify sound command and generated sounds

## Markdown Awareness

- [x] Detect `.md`/Markdown documents for typing behavior
- [ ] Decide whether Luna should hide for non-Markdown files
- [ ] If yes, implement non-Markdown hidden/disabled UI state

## Animation Polish

- [ ] Tune GIF export timing in Aseprite if it still feels too fast or too choppy
- [ ] Add dedicated typing sprite if assets become available
- [x] Add dedicated happy/fireworks frames

## UI Polish

- [x] Apply Space Blue accent `#90D5FF`
- [x] Add transparent sidebar stage
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
- Main implementation file is `src/Provider.ts`.
- Activity and diagnostics logic lives in `src/activityController.ts`.
- State definitions live in `src/stateManager.ts`.
- Demo cycling lives in `src/demoController.ts`.
- Current installed version should be `0.0.19`.
- Rebuild/reinstall after asset changes because installed VSIX contains a copied asset set.
