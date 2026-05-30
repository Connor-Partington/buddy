# Buddy

An animated IDE companion for VS Code that reacts to your coding flow from the Activity Bar.

[![Version](https://img.shields.io/badge/version-0.0.31-blue)](CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: LGPL v2.0](https://img.shields.io/badge/license-LGPL%20v2.0-green.svg)](LICENSE)

## Preview

| Idle | Think | Search | Sleep |
| --- | --- | --- | --- |
| ![Buddy idle animation](assets/images/idle-trim.gif) | ![Buddy thinking animation](assets/images/think-trim.gif) | ![Buddy searching animation](assets/images/search-trim.gif) | ![Buddy sleeping animation](assets/images/sleep-trim.gif) |

| Happy | Love | Jump | Walk |
| --- | --- | --- | --- |
| ![Buddy happy animation](assets/images/happy-trim.gif) | ![Buddy love animation](assets/images/love-trim.gif) | ![Buddy jump animation](assets/images/jump-trim.gif) | ![Buddy walking animation](assets/images/walk-trim.gif) |

Buddy is local-first, lightweight, and built to add a little personality to focused work without sending your code anywhere.

## Table of Contents

- [Preview](#preview)
- [Features](#features)
- [Installation](#installation)
- [Using Buddy](#using-buddy)
- [Commands](#commands)
- [Development](#development)
- [License](#license)

## Features

- Animated sidebar companion with idle, typing, searching, thinking, sleeping, happy, and jump states.
- Editor-aware reactions while you write, navigate, save, and run terminal commands.
- Feed Buddy a cookie from the panel title bar.
- Command Palette controls for showing Buddy, previewing animations, and testing states.

## Installation

### Install from VS Code Marketplace

Install Buddy from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=connor-partington.buddy-ide-companion).

### Install manually

Download the latest `.vsix` package from the [GitHub releases](https://github.com/Connor-Partington/buddy/releases), then install it from VS Code:

1. Open the Extensions view.
2. Choose `Install from VSIX...` from the `...` menu.
3. Select the Buddy `.vsix` file.
4. Run `Developer: Reload Window` if the Activity Bar does not refresh immediately.

## Using Buddy

After installing Buddy, open the Command Palette:

```text
Ctrl+Shift+P on Windows/Linux
Cmd+Shift+P on macOS
```

Run `Buddy: Show Sidebar` to open the Buddy view from the Activity Bar. Buddy will wake up in the sidebar and react as you edit, navigate, save, or run terminal commands.

Try these first:

- `Buddy: Wake Up` to return Buddy to the idle state.
- `Buddy: Preview Animations` to cycle through the available animation states.
- Use the cookie icon in the Buddy panel title bar to feed Buddy.
- `Buddy: Toggle Size` to switch between the default Buddy size and a smaller Buddy.

## Commands

| Command | What it does |
| --- | --- |
| `Buddy: Show Sidebar` | Opens the Buddy Activity Bar view. |
| `Buddy: Wake Up` | Returns Buddy to the idle state. |
| `Buddy: Preview Animations` | Cycles through Buddy's animation states. |
| `Buddy: Spawn Cookie` | Drops a cookie for Buddy to walk over and eat. |
| `Buddy: Toggle Size` | Switches Buddy between default and small sizes. |
| `Buddy: Set State Idle` | Shows the idle state. |
| `Buddy: Set State Typing` | Shows the typing state. |
| `Buddy: Set State Searching` | Shows the searching state. |
| `Buddy: Set State Thinking` | Shows the thinking state. |
| `Buddy: Set State Sleeping` | Shows the sleeping state. |
| `Buddy: Set State Happy` | Shows the happy state. |
| `Buddy: Set State Jump` | Shows the jump state. |

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
code --install-extension buddy-ide-companion-0.0.31.vsix --force
```

## License

GNU Lesser General Public License v2.0
