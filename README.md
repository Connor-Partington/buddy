# Buddy

Buddy is a small, animated IDE companion for VS Code. It lives in your Activity Bar, reacts to your editor activity, and adds a little personality to focused work without sending your code anywhere.

Buddy is local-first, lightweight, and designed as the foundation for a broader IDE companion experience.

## Features

- Animated sidebar companion with idle, typing, searching, thinking, sleeping, happy, and panic states.
- Markdown-aware reactions while you write, navigate, save, and encounter diagnostics.
- Optional sound effects generated locally with the Web Audio API.
- Animated sprite mode with a CSS fallback renderer.
- Command Palette controls for showing Buddy, previewing animations, toggling sounds, and testing states.
- No network calls and no external service dependency.

## Install

### From a VSIX

Download or build a `.vsix` package, then install it in VS Code:

```bash
code --install-extension buddy-ide-companion-0.0.25.vsix
```

You can also install manually from VS Code:

1. Open the Extensions view.
2. Choose `Install from VSIX...` from the `...` menu.
3. Select the Buddy `.vsix` file.
4. Run `Developer: Reload Window` if the Activity Bar does not refresh immediately.

### From Source

Install dependencies and compile:

```bash
npm install
npm run compile
```

Run Buddy in an Extension Development Host:

```text
Press F5 in VS Code
```

Package a local build:

```bash
npx @vscode/vsce package
```

For a one-command local workflow, this project includes a helper that bumps the patch version, compiles, packages, installs, and cleans up older local VSIX files:

```bash
npm run install:local
```

If the VS Code CLI is not in the standard macOS app location or on `PATH`, pass it explicitly:

```bash
CODE_BIN="/path/to/code" npm run install:local
```

The local install helper also removes the legacy local prototype extension ID if it is present, so Buddy does not appear twice in the Activity Bar after the rename.

## Commands

- `Buddy: Show Sidebar`
- `Buddy: Wake Up`
- `Buddy: Preview Animations`
- `Buddy: Toggle Sounds`
- `Buddy: Toggle Animated Sprites`
- `Buddy: Set State Idle`
- `Buddy: Set State Typing`
- `Buddy: Set State Searching`
- `Buddy: Set State Thinking`
- `Buddy: Set State Sleeping`
- `Buddy: Set State Happy`
- `Buddy: Set State Panic`

## How Buddy Reacts

Buddy currently pays attention to Markdown editing activity:

```text
typing -> 1s quiet -> thinking -> 5.5s quiet -> sleeping
```

Clicking or scrolling in supported editor files triggers `searching`. Saving a Markdown document triggers `happy`. Active Markdown diagnostics trigger `panic`.

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

```text
idle      -> idle.gif
typing    -> think.gif
searching -> search.gif
thinking  -> think.gif
sleeping  -> sleep.gif
happy     -> happy.gif
panic     -> jump.gif
```

## Privacy

Buddy runs locally inside VS Code. It does not collect telemetry, call an API, upload source files, or require an account.

## Roadmap

Buddy is starting as a VS Code extension, with room to grow into a more customizable IDE companion over time. Good next steps include more companion themes, richer activity awareness, customizable reactions, and support for additional IDEs.

## License

MIT
