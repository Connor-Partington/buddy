# Buddy

An animated IDE companion for VS Code that reacts to your coding flow from the Activity Bar.

[![Version](https://img.shields.io/badge/version-0.0.27-blue)](CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Preview

| Idle | Think | Search | Sleep |
| --- | --- | --- | --- |
| ![Buddy idle animation](assets/images/idle.gif) | ![Buddy thinking animation](assets/images/think.gif) | ![Buddy searching animation](assets/images/search.gif) | ![Buddy sleeping animation](assets/images/sleep.gif) |

| Happy | Jump | Walk |
| --- | --- | --- |
| ![Buddy happy animation](assets/images/happy.gif) | ![Buddy panic animation](assets/images/jump.gif) | ![Buddy walking animation](assets/images/walk.gif) |

Buddy is local-first, lightweight, and built to add a little personality to focused work without sending your code anywhere.

## Table of Contents

- [Preview](#preview)
- [Features](#features)
- [Installation](#installation)
- [Using Buddy](#using-buddy)
- [Commands](#commands)
- [How Buddy Reacts](#how-buddy-reacts)
- [Assets](#assets)
- [Privacy](#privacy)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

## Features

- Animated sidebar companion with idle, typing, searching, thinking, sleeping, happy, and panic states.
- Editor-aware reactions while you write, navigate, save, and encounter diagnostics.
- Optional local sound effects generated with the Web Audio API.
- Animated sprite rendering with a CSS fallback.
- Command Palette controls for showing Buddy, previewing animations, toggling sounds, and testing states.
- No network calls, external services, telemetry, or account setup.

## Installation

### Install from a VSIX

Download or build a `.vsix` package, then install it with the VS Code CLI:

```bash
code --install-extension buddy-ide-companion-0.0.27.vsix
```

You can also install it from VS Code:

1. Open the Extensions view.
2. Choose `Install from VSIX...` from the `...` menu.
3. Select the Buddy `.vsix` file.
4. Run `Developer: Reload Window` if the Activity Bar does not refresh immediately.

VSIX installs are manual. To update Buddy, install a newer VSIX with the same extension ID.

### Remove the old prototype

If you still have the old local prototype installed from before the rename, remove it once:

```bash
code --uninstall-extension local.docfox
```

## Using Buddy

After installing Buddy, open the Command Palette:

```text
Ctrl+Shift+P on Windows/Linux
Cmd+Shift+P on macOS
```

Run `Buddy: Show Sidebar` to open the Buddy view from the Activity Bar. Buddy will wake up in the sidebar and react as you edit, navigate, save, or run into diagnostics.

Try these first:

- `Buddy: Wake Up` to return Buddy to the idle state.
- `Buddy: Preview Animations` to cycle through the available animation states.
- `Buddy: Toggle Sounds` to turn local sound effects on or off.
- `Buddy: Toggle Animated Sprites` to switch animated sprite rendering on or off.

## Commands

| Command | What it does |
| --- | --- |
| `Buddy: Show Sidebar` | Opens the Buddy Activity Bar view. |
| `Buddy: Wake Up` | Returns Buddy to the idle state. |
| `Buddy: Preview Animations` | Cycles through Buddy's animation states. |
| `Buddy: Toggle Sounds` | Enables or disables local sound effects. |
| `Buddy: Toggle Animated Sprites` | Enables or disables animated sprite rendering. |
| `Buddy: Set State Idle` | Shows the idle state. |
| `Buddy: Set State Typing` | Shows the typing state. |
| `Buddy: Set State Searching` | Shows the searching state. |
| `Buddy: Set State Thinking` | Shows the thinking state. |
| `Buddy: Set State Sleeping` | Shows the sleeping state. |
| `Buddy: Set State Happy` | Shows the happy state. |
| `Buddy: Set State Panic` | Shows the panic state. |

## How Buddy Reacts

Buddy pays attention to editing activity in file-backed and untitled editor tabs:

```text
typing -> 1s quiet -> thinking -> 5.5s quiet -> sleeping
```

Clicking or scrolling in supported editor files triggers `searching`. Saving a document triggers `happy`. Active editor diagnostics trigger `panic`.

## Assets

Animated sprites live in `assets/images`:

```text
happy.gif
idle.gif
jump.gif
search.gif
sleep.gif
think.gif
walk.gif
```

Current state mapping:

| State | Sprite |
| --- | --- |
| `idle` | `idle.gif` |
| `typing` | `think.gif` |
| `searching` | `search.gif` |
| `thinking` | `think.gif` |
| `sleeping` | `sleep.gif` |
| `happy` | `happy.gif` |
| `panic` | `jump.gif` |

## Privacy

Buddy runs locally inside VS Code. It does not collect telemetry, call an API, upload source files, or require an account.

## Development

Install dependencies:

```bash
npm install
```

Run Buddy in an Extension Development Host:

```text
Press F5 in VS Code
```

Keep TypeScript compiling in the background:

```bash
npm run watch
```

Before sharing a build, compile and package a VSIX:

```bash
npm run compile
npm run package
```

Install or update that VSIX locally with the VS Code CLI:

```bash
code --install-extension buddy-ide-companion-0.0.27.vsix --force
```

## Roadmap

Buddy is starting as a VS Code extension, with room to grow into a more customizable IDE companion over time. Good next steps include more companion themes, richer activity awareness, customizable reactions, and support for additional IDEs.

## License

MIT
