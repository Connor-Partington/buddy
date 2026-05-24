import * as vscode from 'vscode';

import { BuddyState, BuddyStateMessage } from './stateManager';

type SpriteKey = BuddyState | 'walk';

export class Provider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'buddy.companion';

  private webviewView?: vscode.WebviewView;
  private state: BuddyState = 'idle';
  private soundsEnabled = false;
  private frameAnimationsEnabled = false;

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    const spriteSources = getSpriteSources(this.extensionUri, webviewView.webview);
    webviewView.webview.html = this.getHtml(webviewView.webview, spriteSources);
    this.postState();
    this.postSoundsEnabled();
    this.postFrameAnimationsEnabled();
  }

  public setState(state: BuddyState): void {
    this.state = state;
    this.postState();
  }

  public setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;
    this.postSoundsEnabled();
  }

  public setFrameAnimationsEnabled(enabled: boolean): void {
    this.frameAnimationsEnabled = enabled;
    this.postFrameAnimationsEnabled();
  }

  private postState(): void {
    const message: BuddyStateMessage = {
      type: 'setState',
      state: this.state,
    };

    void this.webviewView?.webview.postMessage(message);
  }

  private postSoundsEnabled(): void {
    void this.webviewView?.webview.postMessage({
      type: 'setSoundsEnabled',
      enabled: this.soundsEnabled,
    });
  }

  private postFrameAnimationsEnabled(): void {
    void this.webviewView?.webview.postMessage({
      type: 'setFrameAnimationsEnabled',
      enabled: this.frameAnimationsEnabled,
    });
  }

  private getHtml(webview: vscode.Webview, spriteSources: Record<SpriteKey, string>): string {
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Buddy</title>
  <style nonce="${nonce}">
    :root {
      --space-blue: #90d5ff;
      --fox: #ff5f8a;
      --fox-dark: #cf3f6a;
      --cream: #ff9fc0;
      --ink: #23262d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      color: var(--vscode-sideBar-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell {
      min-height: 100vh;
      display: grid;
      align-content: stretch;
      padding: 0;
    }

    .stage {
      display: grid;
      place-items: end center;
      min-height: 220px;
      background: transparent;
      overflow: hidden;
    }

    .fox {
      position: relative;
      width: 148px;
      height: 136px;
      animation: breathe 2.8s ease-in-out infinite;
      transition: filter 160ms ease, transform 160ms ease;
    }

    .frame-stage {
      display: grid;
      place-items: end center;
      width: min(190px, 100%);
      aspect-ratio: 190 / 213;
      align-self: end;
      transform: translateX(var(--walk-x, 0px));
      transition: transform var(--walk-duration, 0ms) linear;
      will-change: transform;
    }

    .sprite-image {
      width: 100%;
      height: auto;
      max-height: 100%;
      align-self: end;
      object-fit: contain;
      image-rendering: pixelated;
      transform: scaleX(var(--sprite-direction, 1));
      transform-origin: center bottom;
    }

    .fox {
      display: none;
    }

    .ear {
      position: absolute;
      display: none;
      top: 14px;
      width: 48px;
      height: 58px;
      background: var(--fox-dark);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
      transform-origin: 50% 100%;
    }

    .ear.left {
      left: 25px;
      rotate: -16deg;
      animation: ear-twitch 5.5s ease-in-out infinite;
    }

    .ear.right {
      right: 25px;
      rotate: 16deg;
      animation: ear-twitch 5.5s ease-in-out infinite reverse;
    }

    .ear::after {
      content: "";
      position: absolute;
      left: 13px;
      top: 18px;
      width: 22px;
      height: 32px;
      background: var(--cream);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
      opacity: 0.9;
    }

    .head {
      position: absolute;
      left: 14px;
      top: 25px;
      width: 120px;
      height: 108px;
      border-radius: 48% 48% 38% 38%;
      background: var(--fox);
      box-shadow: inset 0 -12px 0 rgb(0 0 0 / 10%), 0 10px 0 -6px var(--fox-dark);
    }

    .cheek {
      position: absolute;
      bottom: 28px;
      width: 17px;
      height: 12px;
      background: var(--cream);
      border-radius: 999px;
    }

    .cheek.left {
      left: 20px;
    }

    .cheek.right {
      right: 20px;
    }

    .eye {
      position: absolute;
      top: 39px;
      width: 10px;
      height: 12px;
      border-radius: 50%;
      background: var(--ink);
      animation: blink 4.2s infinite;
    }

    .eye.left {
      left: 34px;
    }

    .eye.right {
      right: 34px;
    }

    .nose {
      position: absolute;
      left: 55px;
      top: 62px;
      width: 11px;
      height: 6px;
      border-radius: 50% 50% 60% 60%;
      background: var(--ink);
    }

    .thought-cloud {
      position: absolute;
      left: 82px;
      top: -9px;
      width: 52px;
      height: 32px;
      opacity: 0;
      transform: translateY(6px) scale(0.96);
      transition: opacity 160ms ease, transform 160ms ease;
      animation: cloud-float 2s ease-in-out infinite;
    }

    .thought-cloud span {
      position: absolute;
      display: block;
      border-radius: 50%;
      background: color-mix(in srgb, var(--space-blue) 82%, white);
      box-shadow: inset 0 -2px 0 rgb(35 38 45 / 10%);
    }

    .thought-cloud span:nth-child(1) {
      left: 3px;
      top: 12px;
      width: 19px;
      height: 17px;
    }

    .thought-cloud span:nth-child(2) {
      left: 14px;
      top: 4px;
      width: 27px;
      height: 24px;
    }

    .thought-cloud span:nth-child(3) {
      right: 3px;
      top: 11px;
      width: 20px;
      height: 18px;
    }

    .thought-cloud span:nth-child(4) {
      left: 13px;
      bottom: -3px;
      width: 8px;
      height: 8px;
      opacity: 0.85;
    }

    .thought-cloud span:nth-child(5) {
      left: 4px;
      bottom: -12px;
      width: 5px;
      height: 5px;
      opacity: 0.7;
    }

    .zzz {
      position: absolute;
      right: 12px;
      top: 4px;
      color: var(--space-blue);
      font-weight: 700;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 160ms ease, transform 160ms ease;
      animation: drift 2.4s ease-in-out infinite;
    }


    body[data-state="typing"] .fox {
      animation: typing-bounce 0.34s ease-in-out infinite;
    }

    body[data-state="typing"] .head {
      box-shadow: inset 0 -10px 0 rgb(0 0 0 / 8%), 0 8px 0 rgb(144 213 255 / 20%);
    }

    body[data-state="thinking"] .fox {
      animation: head-tilt 1.6s ease-in-out infinite;
    }

    body[data-state="searching"] .eye {
      animation: eye-scan 0.9s steps(2, end) infinite;
    }

    body[data-state="searching"] .head {
      box-shadow: inset 0 -10px 0 rgb(0 0 0 / 8%), 0 0 0 4px rgb(144 213 255 / 16%);
    }

    body[data-state="thinking"] .thought-cloud {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    body[data-state="sleeping"] .fox {
      animation: sleepy-breathe 3.4s ease-in-out infinite;
      filter: saturate(0.72);
    }

    body[data-state="sleeping"] .eye {
      height: 3px;
      top: 34px;
      border-radius: 999px;
      animation: none;
    }

    body[data-state="sleeping"] .zzz {
      opacity: 1;
      transform: translateY(0);
    }

    body[data-state="happy"] .fox {
      animation: happy-hop 0.52s ease-in-out infinite;
    }

    body[data-state="happy"] .eye {
      height: 9px;
      border-radius: 50% 50% 6px 6px;
      transform: rotate(180deg);
      animation: none;
    }

    body[data-state="panic"] .fox {
      animation: panic-shake 0.18s steps(2, end) infinite;
      filter: saturate(1.25);
    }

    body[data-state="panic"] .eye {
      animation: none;
      height: 15px;
    }

    @keyframes breathe {
      0%, 100% {
        transform: translateY(0) scaleY(1);
      }
      50% {
        transform: translateY(3px) scaleY(0.985);
      }
    }

    @keyframes blink {
      0%, 45%, 49%, 100% {
        transform: scaleY(1);
      }
      47% {
        transform: scaleY(0.12);
      }
    }

    @keyframes ear-twitch {
      0%, 78%, 84%, 100% {
        transform: rotate(0);
      }
      81% {
        transform: rotate(-5deg);
      }
    }

    @keyframes typing-bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }

    @keyframes head-tilt {
      0%, 100% {
        transform: rotate(-2deg);
      }
      50% {
        transform: rotate(4deg);
      }
    }

    @keyframes eye-scan {
      0%, 100% {
        transform: translateX(-4px);
      }
      50% {
        transform: translateX(4px);
      }
    }

    @keyframes sleepy-breathe {
      0%, 100% {
        transform: translateY(7px) scaleY(0.94);
      }
      50% {
        transform: translateY(10px) scaleY(0.9);
      }
    }

    @keyframes happy-hop {
      0%, 100% {
        transform: translateY(0) rotate(-1deg);
      }
      50% {
        transform: translateY(-9px) rotate(1deg);
      }
    }

    @keyframes panic-shake {
      0%, 100% {
        transform: translateX(-3px) rotate(-2deg);
      }
      50% {
        transform: translateX(3px) rotate(2deg);
      }
    }

    @keyframes cloud-float {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes drift {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-6px);
      }
    }

  </style>
</head>
<body data-state="${this.state}" data-frame-animations="${this.frameAnimationsEnabled}">
  <main class="shell">
    <section class="stage" aria-label="Buddy companion">
      <div class="fox" role="img" aria-label="Buddy waiting in the sidebar">
        <div class="thought-cloud" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        <div class="zzz" aria-hidden="true">Zzz</div>
        <div class="ear left"></div>
        <div class="ear right"></div>
        <div class="head">
          <div class="cheek left"></div>
          <div class="cheek right"></div>
          <div class="eye left"></div>
          <div class="eye right"></div>
          <div class="nose"></div>
        </div>
      </div>
      <div class="frame-stage" role="img" aria-label="Buddy frame animation">
        <img class="sprite-image" alt="" src="${spriteSources[this.state]}" />
      </div>
    </section>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const spriteSources = ${JSON.stringify(spriteSources)};
    const stage = document.querySelector('.stage');
    const spriteImage = document.querySelector('.sprite-image');
    const spriteStage = document.querySelector('.frame-stage');
    let audioContext;
    let soundsEnabled = ${this.soundsEnabled};
    let frameAnimationsEnabled = ${this.frameAnimationsEnabled};
    let lastState = '${this.state}';
    let currentState = '${this.state}';
    let stateBeforeWalk = '${this.state}';
    let walkTimer;
    let walkTransitionTimer;
    let walkX = 0;
    let walkDirection = 1;
    const walkSpeedPxPerSecond = 70;
    const walkVisibleWidthRatio = 0.42;

    function getAudioContext() {
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }

      return audioContext;
    }

    function playTone(frequency, duration, startOffset = 0, type = 'sine', gainValue = 0.026) {
      const context = getAudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startTime = context.currentTime + startOffset;
      const endTime = startTime + duration;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
    }

    function playStateSound(state) {
      if (!soundsEnabled || state === lastState) {
        return;
      }

      if (state === 'typing') {
        playTone(520, 0.035, 0, 'square', 0.014);
      } else if (state === 'searching') {
        playTone(360, 0.08, 0, 'triangle', 0.018);
        playTone(540, 0.08, 0.07, 'triangle', 0.016);
      } else if (state === 'thinking') {
        playTone(660, 0.05, 0, 'sine', 0.02);
      } else if (state === 'happy') {
        playTone(640, 0.08, 0, 'sine', 0.024);
        playTone(860, 0.1, 0.09, 'sine', 0.024);
      }
    }

    function setSoundsEnabled(enabled, playFeedback = true) {
      soundsEnabled = enabled;
      vscode.setState({ state: document.body.dataset.state || 'idle', soundsEnabled });

      if (enabled && playFeedback) {
        playTone(720, 0.06, 0, 'sine', 0.018);
      }
    }

    function setSpriteForState(state) {
      if (!spriteImage) {
        return;
      }

      const source = spriteSources[state] || spriteSources.idle;
      if (source && spriteImage.getAttribute('src') !== source) {
        spriteImage.setAttribute('src', source);
      }
    }

    function getWalkLimit(useVisibleWalkWidth = false) {
      if (!stage || !spriteStage) {
        return 0;
      }

      const stageWidth = stage.getBoundingClientRect().width;
      const spriteWidth = spriteStage.getBoundingClientRect().width * (useVisibleWalkWidth ? walkVisibleWidthRatio : 1);
      return Math.max(0, (stageWidth - spriteWidth) / 2);
    }

    function applyWalkPosition(durationMs = 0) {
      if (!spriteStage) {
        return;
      }

      spriteStage.style.setProperty('--walk-duration', durationMs + 'ms');
      spriteStage.style.setProperty('--walk-x', walkX + 'px');
      spriteStage.style.setProperty('--sprite-direction', String(walkDirection));
    }

    function captureWalkPosition() {
      if (!spriteStage) {
        return;
      }

      const transform = getComputedStyle(spriteStage).transform;
      if (transform && transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        walkX = matrix.m41;
      }

      applyWalkPosition(0);
    }

    function clampWalkPosition() {
      const limit = getWalkLimit(true);
      walkX = Math.min(limit, Math.max(-limit, walkX));
      applyWalkPosition(0);
    }

    function clearRandomWalk() {
      if (walkTimer) {
        clearTimeout(walkTimer);
        walkTimer = undefined;
      }
      if (walkTransitionTimer) {
        clearTimeout(walkTransitionTimer);
        walkTransitionTimer = undefined;
      }
      captureWalkPosition();
    }

    function scheduleRandomWalk() {
      if (walkTimer || (currentState !== 'idle' && currentState !== 'sleeping')) {
        return;
      }

      const delay = currentState === 'sleeping'
        ? 12000 + Math.random() * 26000
        : 8000 + Math.random() * 14000;
      walkTimer = setTimeout(() => {
        walkTimer = undefined;
        startRandomWalk();
      }, delay);
    }

    function startRandomWalk() {
      if (!spriteImage || !spriteStage || (currentState !== 'idle' && currentState !== 'sleeping')) {
        scheduleRandomWalk();
        return;
      }

      const walkSource = spriteSources.walk;
      if (!walkSource) {
        return;
      }

      const limit = getWalkLimit();
      if (limit <= 0) {
        scheduleRandomWalk();
        return;
      }

      const targetX = walkDirection > 0 ? limit : -limit;
      const distance = Math.abs(targetX - walkX);
      const durationMs = Math.max(900, Math.round((distance / walkSpeedPxPerSecond) * 1000));

      stateBeforeWalk = currentState;
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      spriteImage.setAttribute('src', walkSource);
      walkX = targetX;
      applyWalkPosition(durationMs);

      walkTransitionTimer = setTimeout(() => {
        walkTransitionTimer = undefined;
        walkDirection *= -1;
        currentState = stateBeforeWalk;
        document.body.dataset.state = currentState;
        setSpriteForState(currentState);
        applyWalkPosition(0);
        scheduleRandomWalk();
      }, durationMs);
    }

    function setFrameAnimationsEnabled(enabled) {
      frameAnimationsEnabled = enabled;
      document.body.dataset.frameAnimations = String(enabled);
      vscode.setState({
        state: document.body.dataset.state || 'idle',
        soundsEnabled,
        frameAnimationsEnabled,
      });

      setSpriteForState(document.body.dataset.state || 'idle');
    }

    function setState(state) {
      playStateSound(state);
      clearRandomWalk();
      currentState = state;
      document.body.dataset.state = state;
      vscode.setState({ state, soundsEnabled, frameAnimationsEnabled });
      setSpriteForState(state);
      scheduleRandomWalk();
      lastState = state;
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'setState') {
        setState(message.state);
      } else if (message.type === 'setSoundsEnabled') {
        setSoundsEnabled(message.enabled);
      } else if (message.type === 'setFrameAnimationsEnabled') {
        setFrameAnimationsEnabled(message.enabled);
      }
    });

    setState('${this.state}');
    setSoundsEnabled(soundsEnabled, false);
    setFrameAnimationsEnabled(frameAnimationsEnabled);
    clampWalkPosition();
    window.addEventListener('resize', clampWalkPosition);
  </script>
</body>
</html>`;
  }
}

function getSpriteSources(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
): Record<SpriteKey, string> {
  const spriteFiles: Record<SpriteKey, string> = {
    idle: 'idle.gif',
    typing: 'think.gif',
    searching: 'search.gif',
    thinking: 'think.gif',
    sleeping: 'sleep.gif',
    happy: 'happy.gif',
    panic: 'jump.gif',
    walk: 'walk.gif',
  };

  return Object.fromEntries(
    Object.entries(spriteFiles).map(([state, file]) => [
      state,
      webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'images', file)).toString(),
    ]),
  ) as Record<SpriteKey, string>;
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
