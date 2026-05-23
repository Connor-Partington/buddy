# DocFox MVP Checklist

A lightweight VS Code companion for Markdown copyediting workflows.

---

# Goals

Create a simple VS Code sidebar companion that:

- Appears when editing Markdown files
- Reacts to typing activity
- Sleeps when idle
- Shows a thinking animation after typing pauses
- Uses lightweight sprite animations
- Runs entirely locally
- Requires no AI infrastructure

---

# Tech Stack

- TypeScript
- VS Code Extension API
- HTML/CSS/JS Webview
- Pixel-art sprites
- CSS sprite animations

---

# Project Setup

- [x] Install Node.js
- [ ] Install Yeoman and generator-code

```bash
npm install -g yo generator-code
```

- [x] Generate extension project

```bash
yo code
```

- [ ] Select:
- [x] TypeScript
- [x] New Extension

- [x] Name project `docfox`
- [ ] Open project in VS Code
- [ ] Run extension host using `F5`

---

# Create Sidebar Panel

## package.json

- [x] Add Activity Bar container
- [x] Add DocFox sidebar view
- [x] Add extension icon

### Success Criteria

- [ ] DocFox icon appears in VS Code sidebar
- [ ] Sidebar panel opens correctly

---

# Create Webview

## Files

- [ ] Create:

```text
src/DocFoxProvider.ts
```

## Tasks

- [x] Register webview provider
- [x] Render HTML UI
- [x] Display placeholder fox sprite

### Success Criteria

- [ ] Fox appears in sidebar

---

# Create State System

## States

- [x] idle
- [x] typing
- [x] thinking
- [x] sleeping
- [x] happy (optional)

## Logic

- [x] Create `setState()` function
- [x] Send messages from extension → webview
- [x] Update displayed animation

### Success Criteria

- [ ] Fox changes state dynamically

---

# Detect Typing Activity

## Typing Detection

- [ ] Listen to:

```ts
vscode.workspace.onDidChangeTextDocument
```

- [ ] Set state to `typing`
- [ ] Reset idle timer

---

# Detect Idle State

## Idle Flow

- [ ] After 1 second:
  - [ ] Switch to `thinking`

- [ ] After additional 2–3 seconds:
  - [ ] Switch to `sleeping`

### Expected Flow

```text
typing → thinking → sleeping
```

---

# Sprite System

## Folder Structure

- [ ] Create:

```text
media/
├── idle/
├── typing/
├── thinking/
├── sleeping/
└── happy/
```

## Assets

- [ ] Add idle frames
- [ ] Add typing frames
- [ ] Add thinking frames
- [ ] Add sleeping frames

---

# Animation System

## Choose Animation Method

- [ ] GIF animations
OR
- [ ] CSS spritesheets (recommended)

---

# Idle Animation

- [ ] Blinking
- [ ] Ear twitch
- [ ] Breathing effect

---

# Typing Animation

- [ ] Paw movement
- [ ] Keyboard bounce
- [ ] Tail movement

---

# Thinking Animation

- [ ] Floating dots
- [ ] Head tilt
- [ ] Blinking

---

# Sleeping Animation

- [ ] Sleeping pose
- [ ] Zzz bubble
- [ ] Slow breathing

### Success Criteria

- [ ] DocFox feels alive

---

# Markdown Awareness

- [ ] Detect active editor
- [ ] Detect `.md` files
- [ ] Show DocFox only for Markdown
- [ ] Hide for non-doc files

---

# UI Polish

## Theme

- [ ] Apply Space Blue theme
- [ ] Use:

```text
#90D5FF
```

## Styling

- [ ] Rounded corners
- [ ] Smooth transitions
- [ ] Better spacing
- [ ] Reduce animation jitter

---

# Optional Features

## Save Reactions

- [ ] Detect save event
- [ ] Trigger happy animation

---

# Reading State

- [ ] Detect reading/no typing
- [ ] Add reading animation

---

# Surprise State

- [ ] React to markdown lint issues
- [ ] Trigger surprised animation

---

# Recommended File Structure

```text
docfox/
│
├── media/
│   ├── idle/
│   ├── typing/
│   ├── thinking/
│   ├── sleeping/
│   └── happy/
│
├── src/
│   ├── extension.ts
│   ├── DocFoxProvider.ts
│   ├── stateManager.ts
│   └── animations.ts
│
├── package.json
└── tsconfig.json
```

---

# MVP Completion Criteria

- [ ] Open Markdown file
- [ ] DocFox appears automatically
- [ ] Typing triggers typing animation
- [ ] Thinking state triggers after pause
- [ ] Sleeping state triggers after idle
- [ ] Animations play smoothly
- [ ] Extension runs successfully in VS Code
- [ ] Sidebar UI works correctly

---

# Future Ideas

- [ ] Copilot-aware reactions
- [ ] Walking animation
- [ ] Floating overlay mode
- [ ] Sound effects
- [ ] Git integration
- [ ] PR celebration animation
- [ ] Reading stats
- [ ] Documentation quality mood system
