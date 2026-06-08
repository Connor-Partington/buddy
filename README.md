# Buddy

An animated IDE companion for VS Code that reacts to your coding flow from the Activity Bar.

[![Version](https://img.shields.io/badge/version-0.7.0-blue)](CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: LGPL v2.0](https://img.shields.io/badge/license-LGPL%20v2.0-green.svg)](LICENSE)

## Preview

<p align="left">
  <img src="assets/images/buddy-demo.gif" alt="Buddy feature demo" style="width: 100%; max-width: 720px; height: auto;">
</p>

Buddy is local-first, lightweight, and built to add a little personality to focused work.

## Table of Contents

- [Preview](#preview)
- [Features](#features)
- [Feature Guide](FEATURES.md)
- [Installation](#installation)
- [Using Buddy](#using-buddy)
- [Actions](#actions)
- [Commands](#commands)
- [Development](#development)
- [License](#license)

## Features

- Animated sidebar companion that reacts to editing, navigation, saves, terminal commands, Git commits, and pushes.
- Three-heart health, treats, automatic care and celebration drops, gold heart shields, death/revive behavior, and a persistent life counter.
- XP, levels up to 100, coffee boosts, daily quests, level-up cards, and configurable milestone reactions.
- Attention meter, break prompts, cursor-aware look sprites, panel movement, and treat-chasing animations.
- Command Palette controls for showing Buddy, feeding treats, previewing animations, and testing states.

See the [Feature Guide](FEATURES.md) for the full behavior reference.

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

Buddy tracks health, attention, XP, daily quests, milestones, focus mode, and the current life across sessions without telemetry or source upload. For the full behavior reference, see the [Feature Guide](FEATURES.md).

Care difficulty is configurable in VS Code settings. You can tune heart drain timing, break prompt timing, XP gain multiplier, death penalty, and whether Buddy can die.

## Actions

- Command-click inside the Buddy panel to offer a cookie at that spot.
- Use the <img src="media/cookie-dark.png" alt="cookie icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to feed Buddy.
- Use the <img src="media/revive-dark.png" alt="revive icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to revive Buddy.
- Use the <img src="media/death-dark.png" alt="death icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to kill Buddy.
- Use the <img src="media/break-dark.png" alt="break prompt icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to toggle the break prompt.

## Commands

| Command | What it does |
| --- | --- |
| `Buddy: Show Sidebar` | Opens the Buddy Activity Bar view. |
| `Buddy: Wake Up` | Returns Buddy to the idle state. |
| `Buddy: Preview Animations` | Cycles through Buddy's animation states. |
| `Buddy: Spawn Cookie` | Drops a cookie for Buddy to walk over, eat, and recover a heart. |
| `Buddy: Spawn Coffee` | Drops coffee for Buddy to walk over, drink, and gain bonus XP. |
| `Buddy: Spawn Sandwich` | Drops a sandwich for Buddy to walk over, eat, and refill missing red hearts. |
| `Buddy: Spawn Cake` | Drops cake for Buddy to walk over, eat, and gain a gold heart shield. |
| `Buddy: Toggle Break Prompt` | Shows or hides Buddy's break reminder speech bubble. |
| `Buddy: Toggle Focus Mode` | Puts Buddy down for a quiet nap, shows `FOCUS MODE ON`, and pauses heart loss, break prompts, and panel care actions until focus mode ends. |
| `Buddy: Remove Heart` | Removes one heart for testing death and revive behavior. |
| `Buddy: Add XP` | Adds 25 XP for testing the XP counter and burst animation. |
| `Buddy: Reset XP` | Resets Buddy's XP progress to level 1. |
| `Buddy: Reset All State` | Clears Buddy's local testing state, including health, XP, attention, daily quests, milestones, and auto-reward counters. |
| `Buddy: Run Feature Demo` | Opens the Buddy sidebar and runs the automated recording demo sequence. |
| `Buddy: Set XP Multiplier` | Changes the configured XP multiplier for future XP gains. |
| `Buddy: Show Debug Dashboard` | Opens a VS Code dashboard with health, XP, attention, and auto-reward state snapshots. |
| `Buddy: Open Level-Up Gallery` | Lists locally saved level-up cards and opens the selected card image. |
| `Buddy: Kill` | Drains all hearts to trigger Buddy's death state. |
| `Buddy: Revive` | Plays Buddy's revive animation and restores three hearts after death. |
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
code --install-extension buddy-ide-companion-0.7.0.vsix --force
```

To record Buddy's core feature loop, start recording the Extension Development Host window, then run this from the repo terminal:

```bash
npm run demo
```

The demo opens the Buddy sidebar and automatically runs through state changes, one-heart loss, cookie recovery, the break prompt, XP bursts, death, and revive. Keep the Extension Development Host open while it plays.

## License

GNU Lesser General Public License v2.0
