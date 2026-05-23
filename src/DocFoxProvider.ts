import * as vscode from 'vscode';

import { DocFoxState, DocFoxStateMessage, getDocFoxStateLabel } from './stateManager';

export class DocFoxProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'docfox.companion';

  private webviewView?: vscode.WebviewView;
  private state: DocFoxState = 'idle';
  private soundsEnabled = false;
  private frameAnimationsEnabled = false;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onToggleSounds: () => void,
    private readonly onToggleFrameAnimations: () => void,
  ) {}

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    const frameSources = await getFrameSources(this.extensionUri, webviewView.webview);
    webviewView.webview.html = this.getHtml(webviewView.webview, frameSources);
    webviewView.webview.onDidReceiveMessage((message: { type?: string }) => {
      if (message.type === 'toggleSounds') {
        this.onToggleSounds();
      } else if (message.type === 'toggleFrameAnimations') {
        this.onToggleFrameAnimations();
      }
    });
    this.postState();
    this.postSoundsEnabled();
    this.postFrameAnimationsEnabled();
  }

  public setState(state: DocFoxState): void {
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
    const message: DocFoxStateMessage = {
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

  private getHtml(webview: vscode.Webview, frameSources: Record<DocFoxState, string[]>): string {
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Luna</title>
  <style nonce="${nonce}">
    :root {
      --space-blue: #90d5ff;
      --panel: color-mix(in srgb, var(--vscode-sideBar-background) 88%, var(--space-blue));
      --line: color-mix(in srgb, var(--vscode-sideBar-foreground) 18%, transparent);
      --fox: #e97831;
      --fox-dark: #9f431d;
      --cream: #ffe8bf;
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
      align-content: center;
      gap: 18px;
      padding: 18px;
    }

    .stage {
      display: grid;
      place-items: center;
      min-height: 220px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
      transition: background-color 160ms ease, border-color 160ms ease;
    }

    .fox {
      position: relative;
      width: 148px;
      height: 136px;
      animation: breathe 2.8s ease-in-out infinite;
      transition: filter 160ms ease, transform 160ms ease;
    }

    .frame-stage {
      display: none;
      place-items: center;
      width: min(190px, 100%);
      aspect-ratio: 190 / 213;
    }

    .frame-canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    body[data-frame-animations="true"] .fox {
      display: none;
    }

    body[data-frame-animations="true"] .frame-stage {
      display: grid;
    }

    .ear {
      position: absolute;
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
      left: 22px;
      top: 43px;
      width: 104px;
      height: 86px;
      border-radius: 42% 42% 46% 46%;
      background: var(--fox);
      box-shadow: inset 0 -10px 0 rgb(0 0 0 / 8%);
    }

    .cheek {
      position: absolute;
      bottom: 0;
      width: 58px;
      height: 52px;
      background: var(--cream);
      border-radius: 48% 48% 45% 45%;
    }

    .cheek.left {
      left: 0;
      clip-path: polygon(0 0, 100% 35%, 88% 100%, 0 100%);
    }

    .cheek.right {
      right: 0;
      clip-path: polygon(0 35%, 100% 0, 100% 100%, 12% 100%);
    }

    .eye {
      position: absolute;
      top: 29px;
      width: 10px;
      height: 12px;
      border-radius: 50%;
      background: var(--ink);
      animation: blink 4.2s infinite;
    }

    .eye.left {
      left: 32px;
    }

    .eye.right {
      right: 32px;
    }

    .nose {
      position: absolute;
      left: 45px;
      top: 49px;
      width: 15px;
      height: 11px;
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

    .status {
      display: grid;
      gap: 6px;
      text-align: center;
    }

    .toolbar {
      display: flex;
      justify-content: center;
    }

    .sound-toggle,
    .frame-toggle {
      position: relative;
      width: 30px;
      height: 30px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--vscode-sideBar-foreground);
      background: color-mix(in srgb, var(--vscode-sideBar-background) 82%, var(--space-blue));
      cursor: pointer;
    }

    .sound-toggle::before {
      content: "";
      position: absolute;
      left: 8px;
      top: 10px;
      width: 7px;
      height: 10px;
      background: currentColor;
      clip-path: polygon(0 30%, 42% 30%, 100% 0, 100% 100%, 42% 70%, 0 70%);
    }

    .sound-toggle::after {
      content: "";
      position: absolute;
      left: 17px;
      top: 8px;
      width: 7px;
      height: 14px;
      border-right: 2px solid currentColor;
      border-radius: 50%;
      opacity: 0.35;
    }

    .sound-toggle[aria-pressed="true"] {
      border-color: var(--space-blue);
      color: var(--space-blue);
    }

    .sound-toggle[aria-pressed="true"]::after {
      opacity: 1;
    }

    .frame-toggle {
      margin-left: 8px;
    }

    .frame-toggle::before {
      content: "";
      position: absolute;
      left: 8px;
      top: 8px;
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      box-shadow: 4px 4px 0 rgb(144 213 255 / 28%);
    }

    .frame-toggle::after {
      content: "";
      position: absolute;
      left: 12px;
      top: 12px;
      width: 6px;
      height: 6px;
      background: currentColor;
      opacity: 0.35;
    }

    .frame-toggle[aria-pressed="true"] {
      border-color: var(--space-blue);
      color: var(--space-blue);
    }

    .frame-toggle[aria-pressed="true"]::after {
      opacity: 1;
    }

    .name {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .mood {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
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
    <section class="stage" aria-label="Luna companion">
      <div class="fox" role="img" aria-label="Luna waiting in the sidebar">
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
      <div class="frame-stage" role="img" aria-label="Luna frame animation">
        <canvas class="frame-canvas" width="190" height="213"></canvas>
      </div>
    </section>
    <section class="status" aria-live="polite">
      <h1 class="name">Luna</h1>
      <p class="mood">${getDocFoxStateLabel(this.state)}</p>
      <div class="toolbar">
        <button class="sound-toggle" type="button" aria-label="Toggle Luna sounds" aria-pressed="${this.soundsEnabled}"></button>
        <button class="frame-toggle" type="button" aria-label="Toggle Luna frame animations" aria-pressed="${this.frameAnimationsEnabled}"></button>
      </div>
    </section>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const frameSources = ${JSON.stringify(frameSources)};
    const labels = ${JSON.stringify({
      idle: getDocFoxStateLabel('idle'),
      typing: getDocFoxStateLabel('typing'),
      searching: getDocFoxStateLabel('searching'),
      thinking: getDocFoxStateLabel('thinking'),
      sleeping: getDocFoxStateLabel('sleeping'),
      happy: getDocFoxStateLabel('happy'),
      panic: getDocFoxStateLabel('panic'),
    })};
    const mood = document.querySelector('.mood');
    const soundToggle = document.querySelector('.sound-toggle');
    const frameToggle = document.querySelector('.frame-toggle');
    const frameCanvas = document.querySelector('.frame-canvas');
    const frameContext = frameCanvas?.getContext('2d');
    let audioContext;
    let soundsEnabled = ${this.soundsEnabled};
    let frameAnimationsEnabled = ${this.frameAnimationsEnabled};
    let lastState = '${this.state}';
    let animationFrameId;
    let animationToken = 0;
    const frameDurationMs = 250;
    const processedFrames = new Map();

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
      if (soundToggle) {
        soundToggle.setAttribute('aria-pressed', String(enabled));
      }
      vscode.setState({ state: document.body.dataset.state || 'idle', soundsEnabled });

      if (enabled && playFeedback) {
        playTone(720, 0.06, 0, 'sine', 0.018);
      }
    }

    function loadImage(source) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = source;
      });
    }

    async function getProcessedFrame(source) {
      const cached = processedFrames.get(source);
      if (cached) {
        return cached;
      }

      const image = await loadImage(source);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const isGreenScreen = green > 125 && green > red * 1.35 && green > blue * 1.35;

        if (isGreenScreen) {
          data[index + 3] = 0;
        }
      }

      context.putImageData(imageData, 0, 0);
      processedFrames.set(source, canvas);
      return canvas;
    }

    async function getFramesForState(state) {
      const sources = frameSources[state] || frameSources.idle || [];
      return Promise.all(sources.map((source) => getProcessedFrame(source)));
    }

    function stopFrameAnimation() {
      animationToken += 1;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;
      }
    }

    function drawFrame(frame) {
      if (!frameContext || !frameCanvas) {
        return;
      }

      if (frameCanvas.width !== frame.width || frameCanvas.height !== frame.height) {
        frameCanvas.width = frame.width;
        frameCanvas.height = frame.height;
      }
      frameContext.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
      frameContext.drawImage(frame, 0, 0);
    }

    async function startFrameAnimation(state) {
      stopFrameAnimation();
      if (!frameAnimationsEnabled) {
        return;
      }

      const token = animationToken;
      const frames = await getFramesForState(state);
      if (token !== animationToken || frames.length === 0) {
        return;
      }

      let frameIndex = 0;
      let lastFrameTime = performance.now();
      drawFrame(frames[frameIndex]);

      function tick(now) {
        if (token !== animationToken || !frameAnimationsEnabled) {
          return;
        }

        if (now - lastFrameTime >= frameDurationMs) {
          const frameSteps = Math.floor((now - lastFrameTime) / frameDurationMs);
          frameIndex = (frameIndex + frameSteps) % frames.length;
          lastFrameTime += frameSteps * frameDurationMs;
          drawFrame(frames[frameIndex]);
        }

        animationFrameId = requestAnimationFrame(tick);
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    function setFrameAnimationsEnabled(enabled) {
      frameAnimationsEnabled = enabled;
      document.body.dataset.frameAnimations = String(enabled);
      if (frameToggle) {
        frameToggle.setAttribute('aria-pressed', String(enabled));
      }
      vscode.setState({
        state: document.body.dataset.state || 'idle',
        soundsEnabled,
        frameAnimationsEnabled,
      });

      if (enabled) {
        void startFrameAnimation(document.body.dataset.state || 'idle');
      } else {
        stopFrameAnimation();
      }
    }

    function setState(state) {
      playStateSound(state);
      document.body.dataset.state = state;
      if (mood) {
        mood.textContent = labels[state] || labels.idle;
      }
      vscode.setState({ state, soundsEnabled, frameAnimationsEnabled });
      void startFrameAnimation(state);
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

    soundToggle?.addEventListener('click', () => {
      vscode.postMessage({ type: 'toggleSounds' });
    });

    frameToggle?.addEventListener('click', () => {
      vscode.postMessage({ type: 'toggleFrameAnimations' });
    });

    setState('${this.state}');
    setSoundsEnabled(soundsEnabled, false);
    setFrameAnimationsEnabled(frameAnimationsEnabled);
  </script>
</body>
</html>`;
  }
}

async function getFrameSources(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
): Promise<Record<DocFoxState, string[]>> {
  const frameSets: Record<DocFoxState, string> = {
    idle: 'fox-frames-idle',
    typing: 'fox-frames-looking',
    searching: 'fox-frames-looking',
    thinking: 'fox-frames-thinking',
    sleeping: 'fox-frames-sleeping',
    happy: 'fox-frames-idle',
    panic: 'fox-frames-panic',
  };

  const entries = await Promise.all(
    Object.entries(frameSets).map(async ([state, folder]) => {
      const folderUri = vscode.Uri.joinPath(extensionUri, 'assets', 'images', folder);
      const frames = await getFramesInFolder(folderUri, webview);
      return [state, frames] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<DocFoxState, string[]>;
}

async function getFramesInFolder(folderUri: vscode.Uri, webview: vscode.Webview): Promise<string[]> {
  try {
    const entries = await vscode.workspace.fs.readDirectory(folderUri);
    return entries
      .filter(([name, type]) => type === vscode.FileType.File && /^frame_\d+\.png$/i.test(name))
      .sort(([first], [second]) => getFrameNumber(first) - getFrameNumber(second))
      .map(([name]) => webview.asWebviewUri(vscode.Uri.joinPath(folderUri, name)).toString());
  } catch {
    return [];
  }
}

function getFrameNumber(name: string): number {
  return Number(name.match(/\d+/)?.[0] ?? 0);
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
