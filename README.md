# Buddy

An animated IDE companion for VS Code that reacts to your coding flow from the Activity Bar.

[![Version](https://img.shields.io/badge/version-0.0.29-blue)](CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: LGPL v2.0](https://img.shields.io/badge/license-LGPL%20v2.0-green.svg)](LICENSE)

## Preview

| Idle | Think | Search | Sleep |
| --- | --- | --- | --- |
| ![Buddy idle animation](assets/images/idle-trim.gif) | ![Buddy thinking animation](assets/images/think-trim.gif) | ![Buddy searching animation](assets/images/search-trim.gif) | ![Buddy sleeping animation](assets/images/sleep-trim.gif) |

| Happy | Love | Jump | Walk |
| --- | --- | --- | --- |
| ![Buddy happy animation](assets/images/happy-trim.gif) | ![Buddy love animation](assets/images/love-trim.gif) | ![Buddy panic animation](assets/images/jump-trim.gif) | ![Buddy walking animation](assets/images/walk-trim.gif) |

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
code --install-extension buddy-ide-companion-0.0.29.vsix
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
- `Buddy: Toggle Size` to switch between the default Buddy size and a smaller Buddy.

## Commands

| Command | What it does |
| --- | --- |
| `Buddy: Show Sidebar` | Opens the Buddy Activity Bar view. |
| `Buddy: Wake Up` | Returns Buddy to the idle state. |
| `Buddy: Preview Animations` | Cycles through Buddy's animation states. |
| `Buddy: Toggle Sounds` | Enables or disables local sound effects. |
| `Buddy: Toggle Animated Sprites` | Enables or disables animated sprite rendering. |
| `Buddy: Toggle Size` | Switches Buddy between default and small sizes. |
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

Clicking or scrolling in supported editor files triggers `searching`. Clicking Buddy shows `love-trim.gif`. Saving a document triggers `happy`. Active editor diagnostics trigger `panic`.

## Assets

Animated sprites live in `assets/images`:

```text
happy-trim.gif
happy.gif
idle-trim.gif
idle.gif
jump-trim.gif
jump.gif
love-trim.gif
love.gif
search-trim.gif
search.gif
sleep-trim.gif
sleep.gif
think-trim.gif
think.gif
walk-trim.gif
walk.gif
```

Buddy uses the `*-trim.gif` sprites at runtime. The full-size originals remain in the folder for editing and reference.

Current state mapping:

| State | Sprite |
| --- | --- |
| `idle` | `idle-trim.gif` |
| `typing` | `think-trim.gif` |
| `searching` | `search-trim.gif` |
| `thinking` | `think-trim.gif` |
| `sleeping` | `sleep-trim.gif` |
| `happy` | `happy-trim.gif` |
| `panic` | `jump-trim.gif` |

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
code --install-extension buddy-ide-companion-0.0.29.vsix --force
```

## Roadmap

Buddy is starting as a VS Code extension, with room to grow into a more customizable IDE companion over time. Good next steps include more companion themes, richer activity awareness, customizable reactions, and support for additional IDEs.

## License

GNU Lesser General Public License v2.0
