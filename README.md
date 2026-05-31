# Buddy

An animated IDE companion for VS Code that reacts to your coding flow from the Activity Bar.

[![Version](https://img.shields.io/badge/version-0.2.0-blue)](CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: LGPL v2.0](https://img.shields.io/badge/license-LGPL%20v2.0-green.svg)](LICENSE)

## Preview

<table>
  <tr>
    <th>Idle</th>
    <th>Think</th>
    <th>Search</th>
    <th>Sleep</th>
    <th>Happy</th>
    <th>Love</th>
    <th>Jump</th>
    <th>Walk</th>
  </tr>
  <tr>
    <td align="center" valign="bottom"><img src="assets/images/idle-trim.gif" alt="Buddy idle animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/think-trim.gif" alt="Buddy thinking animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/search-trim.gif" alt="Buddy searching animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/sleep-trim.gif" alt="Buddy sleeping animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/happy-trim.gif" alt="Buddy happy animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/love-trim.gif" alt="Buddy love animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/jump-trim.gif" alt="Buddy jump animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/walk-trim.gif" alt="Buddy walking animation"></td>
  </tr>
</table>

<table>
  <tr>
    <th>Cookie</th>
    <th>Eat</th>
    <th>Death</th>
    <th>Soul</th>
    <th>Heart</th>
    <th>Empty Heart</th>
    <th>Filling Heart</th>
  </tr>
  <tr>
    <td align="center" valign="bottom"><img src="assets/images/cookie-trim.gif" alt="Buddy cookie treat animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/eat-trim.gif" alt="Buddy eating animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/death-trim.gif" alt="Buddy death animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/soul-trim.gif" alt="Buddy soul animation"></td>
    <td align="center" valign="bottom"><img src="assets/images/heart-trim.gif" alt="Buddy full heart"></td>
    <td align="center" valign="bottom"><img src="assets/images/heart-empty-trim.gif" alt="Buddy empty heart"></td>
    <td align="center" valign="bottom"><img src="assets/images/heart-fill-trim.gif" alt="Buddy filling heart animation"></td>
  </tr>
</table>

Buddy is local-first, lightweight, and built to add a little personality to focused work.

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
- Three-heart health meter with one heart lost every three focused hours, cookie feeding to recover, and a floating soul when Buddy dies.
- Speech bubbles for break reminders, heart loss, and cookie eating, with scrambled text that decodes into Buddy's message.
- Editor-aware reactions while you write, navigate, save, and run terminal commands.
- Feed Buddy a cookie to keep him alive.
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
- Use the <img src="media/cookie-dark.svg" alt="cookie icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to feed Buddy.
- Use the <img src="media/revive-dark.svg" alt="revive icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to revive Buddy.
- Use the <img src="media/death-dark.svg" alt="death icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to kill Buddy.
- Use the <img src="media/break-dark.svg" alt="break prompt icon" width="16" height="16" valign="middle"> icon in the Buddy panel title bar to toggle the break prompt.
- `Buddy: Toggle Size` to switch between the default Buddy size and a smaller Buddy.
- `Buddy: Remove Heart` to simulate health loss and death.
- `Buddy: Revive` to restore Buddy if he dies.

## Commands

| Command | What it does |
| --- | --- |
| `Buddy: Show Sidebar` | Opens the Buddy Activity Bar view. |
| `Buddy: Wake Up` | Returns Buddy to the idle state. |
| `Buddy: Preview Animations` | Cycles through Buddy's animation states. |
| `Buddy: Spawn Cookie` | Drops a cookie for Buddy to walk over, eat, and recover a heart. |
| `Buddy: Toggle Break Prompt` | Shows or hides Buddy's break reminder speech bubble. |
| `Buddy: Remove Heart` | Removes one heart for testing death and revive behavior. |
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
code --install-extension buddy-ide-companion-0.2.0.vsix --force
```

## License

GNU Lesser General Public License v2.0
