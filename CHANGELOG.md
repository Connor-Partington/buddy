# Change Log

All notable changes to Buddy will be documented in this file.

## 0.5.1

- Changed coffee to activate a 2x XP multiplier for 30 minutes instead of granting flat XP.
- Added an active `x2` XP boost indicator beside the level and XP bar.
- Added a gentle attention meter below level and XP that refills from feeding, love taps, and double-click chase actions.
- Tuned the attention meter to drain across a typical 8-hour workday instead of over many days.
- Changed Buddy death to clear the active coffee XP multiplier.

## 0.5.0

- Added coffee, sandwich, and cake treat drops with distinct rewards.
- Added gold heart shields, with cake granting up to two gold hearts after Buddy's three red hearts.
- Changed timed heart loss to consume gold hearts before red hearts.
- Added Command Palette commands for spawning coffee, sandwich, and cake treats.
- Added Command-click panel cookie drops so Buddy eats at the clicked spot.
- Added cursor-aware look sprites so Buddy watches the pointer when it gets close.
- Added double-click panel movement so Buddy walks or dashes to the selected spot.
- Changed heart loss to use local wall-clock time instead of only focused VS Code time.
- Fixed double-click movement selecting or dragging panel contents while Buddy moves.
- Fixed cursor look reactions nudging Buddy sideways by keeping look swaps to stable idle and walk frames.
- Fixed cursor look reactions getting stuck when the pointer leaves the Buddy panel for another VS Code area.

## 0.4.0

- Added locally saved level-up card PNGs when Buddy gains a level while the panel is open.
- Added level-scaled XP loss when Buddy dies, including level-downs when the penalty drops total XP below the current level.
- Added an automated feature demo command and `npm run demo` helper for recording Buddy's sidebar behavior, including heart loss and cookie recovery.

## 0.3.0

- Added a persistent XP counter with levels up to 100.
- Added XP gains for supported file saves, feeding Buddy, Git commits detected by VS Code, and successful integrated-terminal `git push` actions.
- Added XP burst sprites above Buddy when XP is earned.
- Added `Buddy: Add XP` for testing XP progress and burst animations.
- Added `Buddy: Reset XP` and `Buddy: Set XP Multiplier` for testing and tuning XP progress.
- Tuned XP so each level needs more XP than the previous level, with level 100 targeted around 85,000 total XP.
- Raised early XP requirements so the first levels no longer advance too quickly.
- Fixed panel switching replaying Buddy's revive animation after he had previously died.

## 0.2.0

- Added a persistent alive day counter that scrambles into place and resets after Buddy dies.
- Added a 25-minute break reminder speech bubble with scrambled text that decodes into Buddy's message.
- Added randomized speech bubble messages for break reminders, heart loss, and cookie eating.
- Added a first-open spawn animation with a Buddy greeting and sequential heart fill.
- Added dash behavior for cookie movement.
- Added `Buddy: Toggle Break Prompt` and a title-bar action for manually showing or hiding the break reminder.
- Added a revive animation that returns Buddy from the soul position before dropping back to the panel bottom.
- Added a revive title-bar action in the Buddy panel.
- Added `Buddy: Kill` and a death title-bar action in the Buddy panel.
- Fixed `Buddy: Revive` to report when Buddy is already alive.
- Fixed reopened Buddy panels desyncing dead state, replaying animations, or letting stale cookies restore hearts.
- Fixed speech bubbles being clipped when Buddy is near a panel edge.

## 0.1.0

- Added a three-heart health meter that drains during focused VS Code time.
- Added cookie feeding health recovery with heart fill animations.
- Added Buddy death, death animation, floating soul, and revive behavior.
- Added `Buddy: Remove Heart` and `Buddy: Revive` commands for testing and recovery.

## 0.0.31

- Added a cookie title-bar action that lets you feed Buddy.
- Added cookie drop, walking, eating, and love reaction animations.
- Removed local sound effects and the sound toggle command.
- Updated README installation and feature documentation.

## 0.0.30

- Added a `jump` state that triggers when an integrated terminal command starts.
- Removed the `panic` state and diagnostics-triggered reaction.
- Added `Buddy: Toggle Size` to switch Buddy between the current default size and a smaller size.

## 0.0.29

- Tightened Buddy's sprite frame to match trimmed GIF bounds and reduce invisible padding.
- Kept Buddy bottom-aligned while resizing the sidebar panel.
- Preserved Buddy's current horizontal position when the click love animation plays.
- Changed the project license from MIT to LGPL v2.0.

## 0.0.28

- Added a click reaction that shows `love-trim.gif` when Buddy is clicked.
- Switched runtime sprite rendering and README previews to trimmed GIF assets.
- Kept the full-size original GIF assets in `assets/images` for editing and reference.

## 0.0.27

- Updated the Marketplace display name to `Buddy - IDE Companion` for the initial public listing.
- Refreshed release metadata and VSIX documentation for the Marketplace upload.

## 0.0.26

- Expanded Buddy reactions from Markdown-only documents to file-backed and untitled editor tabs.
- Updated active diagnostics reactions to work with the current supported editor document.
- Replaced the custom local install script with the standard Extension Development Host, VSIX package, and VS Code CLI install workflow.

## 0.0.25

- Updated the extension identity and user-facing companion name to Buddy.
- Updated commands, Activity Bar labels, sidebar labels, and install messaging for the Buddy identity.
- Added professional project documentation for VSIX installation, source development, commands, privacy, and roadmap.
- Added an MIT license.
- Replaced the internal checklist with public release notes.

## 0.0.24

- Added animated GIF sprite rendering with per-state assets.
- Added optional local sound effects.
- Added local VSIX packaging and install workflow.
- Added typing, navigation, save, inactivity, and diagnostics reactions.
