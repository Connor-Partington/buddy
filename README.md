# Buddy

An animated IDE companion for VS Code that reacts to your coding flow from the Activity Bar.

[![Version](https://img.shields.io/badge/version-0.9.0-blue)](CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: LGPL v2.0](https://img.shields.io/badge/license-LGPL%20v2.0-green.svg)](LICENSE)

## Preview

<p align="left">
  <img src="assets/images/buddy-demo.gif" alt="Buddy 0.9.0: family, ball play, colors, and pixel backgrounds" style="width: 100%; max-width: 720px; height: auto;">
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

- A saved partner and up to four mini Buddys, with independent activities, naps, and click reactions.
- A bouncing ball Buddy can stalk, pounce on, catch, and spit back into the air.
- Eight adaptive pixel backgrounds, custom image imports, and nine saved companion colors.
- A scene-only panel with matching toolbar icons, a smaller default Buddy, and automatic opening on startup.
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

Buddy starts at the smaller size; Toggle Size switches to the larger size and remembers your choice. Buddy opens automatically when VS Code starts or reloads. Disable `buddy.openOnStartup` to keep manual control. The content has a minimum scene height of 360 px, with vertical scrolling in shorter containers. Its width follows your sidebar. VS Code controls the outer sidebar size.

To open Buddy manually, open the Command Palette:

```text
Ctrl+Shift+P on Windows/Linux
Cmd+Shift+P on macOS
```

Run `Buddy: Show Sidebar` to open the Buddy view from the Activity Bar. Buddy will wake up in the sidebar and react as you edit, navigate, save, or run terminal commands.

Buddy tracks health, attention, XP, daily quests, care streaks, milestones, focus mode, and the current life across sessions without telemetry or source upload. For the full behavior reference, see the [Feature Guide](FEATURES.md).

Care difficulty is configurable in VS Code settings. You can tune active VS Code heart drain timing, break prompt timing, XP gain multiplier, death penalty, and whether Buddy can die.

Use the **Manage Family** icon in the panel toolbar: **Spawn partner**, then **Have a kid** to add up to four mini Buddys. The family is saved across reloads. Click a family member for a love animation; **Buddy: Clear Family** in the Command Palette removes the partner and kids. Family members independently look around, fidget, celebrate, and nap on different schedules. Clicking one wakes it for a love reaction. Focus Mode settles everyone down; spacing reserves room for sleep animations and uses another row in narrow panels. There is no separate health or XP to maintain.

Use the **ball icon** in the panel toolbar to give Buddy a toy that gradually bounces and rolls to a stop. Buddy takes turns watching it settle, stalking and pouncing on it, nudging it, or catching it in his mouth and spitting it into the air. Click it again to remove the ball. Feeding, breaks, death, and Focus Mode end ball play so those actions can take over.

Use **Buddy: Choose Background** in the panel’s **…** menu or Command Palette to select adaptive pixel scenes—meadow, night, cherry blossom garden, Japanese temple, space station, neon city, underwater reef, and mushroom forest—or your own PNG/JPEG/WebP/GIF image (up to 10 MB). Custom images are copied into Buddy’s local extension storage and saved across reloads. Choose **Change image scaling…** for **Fill panel**, **Fit whole image**, or **Tile pixels**. Fill preserves proportions and crops edges; Fit shows the whole image; Tile repeats it at 4× pixel scale. Select **Theme background** to restore the default. In an SSH window, the image picker and storage use the extension’s host filesystem.

## Actions

- Command-click inside the Buddy panel to offer a cookie at that spot.
- Use the <img src="media/cookie-dark.png" alt="cookie icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to feed Buddy.
- Use the <img src="media/revive-dark.png" alt="revive icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to revive Buddy.

The toolbar contains Cookie, Revive, Ball, and Manage Family. Death and break-prompt actions remain available through the Command Palette.

Use **Buddy: Change Colors** in the Command Palette or the panel’s **…** menu to recolor Buddy, his partner, all kids, or everyone together. Choose from nine sprite tints; choices persist across reloads and apply to future family members. **Restore default colors** brings back green Buddy/kids and the blue partner.

## Commands

| Command | What it does |
| --- | --- |
| `Buddy: Spawn / Remove Ball` | Toggles the bouncing ball from the toolbar. |
| `Buddy: Change Colors` | Chooses and saves colors for Buddy, partner, kids, or everyone; can restore defaults. |
| `Buddy: Manage Family` | Opens partner and kid actions. |
| `Buddy: Spawn Ball` | Starts a bouncing ball for Buddy to chase in the open panel. |
| `Buddy: Remove Ball` | Ends ball play. |
| `Buddy: Choose Background` | Selects a pixel scene, imports an image, or changes image scaling. |
| `Buddy: Spawn Partner` | Adds one partner and opens the sidebar. |
| `Buddy: Have a Kid` | Adds a mini Buddy after a partner is present, up to four kids. |
| `Buddy: Clear Family` | Removes the partner and all mini Buddys. |
| `Buddy: Show Sidebar` | Opens the Buddy Activity Bar view. |
| `Buddy: Wake Up` | Returns Buddy to the idle state. |
| `Buddy: Preview Animations` | Runs a temporary story preview from Buddy's birth and greeting through movement, look, thinking, jump, happy, size, break, care, quests, coffee XP boost, level up, milestone cake, gold heart, death, revive, and sleep without changing persisted Buddy stats. |
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
| `Buddy: Toggle Size` | Switches Buddy between small (the starting size) and large; your choice is saved. |
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
npm test
npm run lint
npm run package
```

Install or update that VSIX locally with the VS Code CLI:

```bash
code --install-extension buddy-ide-companion-0.9.0.vsix --force
```

To record Buddy's core feature loop, start recording the Extension Development Host window, then run this from the repo terminal:

```bash
npm run demo
```

The demo opens the Buddy sidebar and automatically runs through state changes, one-heart loss, cookie recovery, the break prompt, XP bursts, death, and revive. Keep the Extension Development Host open while it plays.

### Release without GitHub Actions

Build and validate locally with the commands above. Push the release commit, then create a GitHub release and attach the generated VSIX. GitHub Actions workflows are manual-only; no Actions run is needed to build or publish a release.

To update the Marketplace, sign in to [Manage Publishers](https://marketplace.visualstudio.com/manage/publishers/connor-partington), open Buddy’s **… → Update**, and upload the same VSIX. The package includes this README, feature guide, changelog, and preview GIF. A manual upload needs no API token. For CLI publishing, use `vsce login connor-partington` with an Azure DevOps personal access token scoped to **Marketplace (Manage)**, then `vsce publish --packagePath buddy-ide-companion-0.9.0.vsix`. Never commit tokens.

The release preview is rendered from the compiled panel, with temporary demo state. Run `npm run compile && node scripts/build-preview.cjs`, serve the repository locally, and open `out/preview/index.html` to record it. It does not touch your saved Buddy state.

## License

GNU Lesser General Public License v2.0
