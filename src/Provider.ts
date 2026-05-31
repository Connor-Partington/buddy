import * as vscode from 'vscode';

import { BuddyHealth, maxBuddyHearts } from './healthManager';
import { BuddyState, BuddyStateMessage } from './stateManager';

type SpriteKey = BuddyState | 'walk' | 'dash' | 'dashContinue' | 'love' | 'eat' | 'death' | 'soul' | 'revive' | 'spawn';
type ImageKey = 'cookie' | 'heart' | 'heartEmpty' | 'heartFill';
export type BuddySize = 'default' | 'small';

const baseSpriteCanvasWidth = 64;
const baseSpriteDisplayWidth = 190;
const baseCookieDisplayWidth = 28;
const buddySizeScales: Record<BuddySize, number> = {
  default: 1,
  small: 0.72,
};
const spriteTrimSizes: Record<SpriteKey, { width: number; height: number }> = {
  idle: { width: 22, height: 18 },
  typing: { width: 21, height: 33 },
  searching: { width: 16, height: 16 },
  thinking: { width: 21, height: 33 },
  sleeping: { width: 29, height: 26 },
  happy: { width: 20, height: 35 },
  jump: { width: 26, height: 46 },
  walk: { width: 22, height: 18 },
  dash: { width: 26, height: 16 },
  dashContinue: { width: 26, height: 16 },
  love: { width: 18, height: 28 },
  eat: { width: 18, height: 18 },
  death: { width: 22, height: 18 },
  soul: { width: 16, height: 16 },
  revive: { width: 32, height: 32 },
  spawn: { width: 32, height: 32 },
};

export class Provider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'buddy.companion';

  private webviewView?: vscode.WebviewView;
  private state: BuddyState = 'idle';
  private buddySize: BuddySize = 'default';
  private health: BuddyHealth = { hearts: maxBuddyHearts, isDead: false, aliveSince: Date.now(), aliveDays: 1 };
  private shouldPlayIntro: boolean;
  private readonly onDidFeedCookieEmitter = new vscode.EventEmitter<void>();
  public readonly onDidFeedCookie = this.onDidFeedCookieEmitter.event;
  private readonly onDidPlayIntroEmitter = new vscode.EventEmitter<void>();
  public readonly onDidPlayIntro = this.onDidPlayIntroEmitter.event;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    shouldPlayIntro: boolean,
  ) {
    this.shouldPlayIntro = shouldPlayIntro;
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.onDidReceiveMessage((message: { type?: string }) => {
      if (message.type === 'cookieEaten') {
        this.onDidFeedCookieEmitter.fire();
      } else if (message.type === 'introPlayed') {
        this.shouldPlayIntro = false;
        this.onDidPlayIntroEmitter.fire();
      }
    });
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.syncWebviewState();
      }
    });

    const spriteSources = getSpriteSources(this.extensionUri, webviewView.webview);
    const imageSources = getImageSources(this.extensionUri, webviewView.webview);
    webviewView.webview.html = this.getHtml(webviewView.webview, spriteSources, imageSources);
  }

  public setState(state: BuddyState): void {
    this.state = state;
    this.postState();
  }

  public setBuddySize(size: BuddySize): void {
    this.buddySize = size;
    this.postBuddySize();
  }

  public setHealth(health: BuddyHealth): void {
    this.health = health;
    this.postHealth();
  }

  public spawnCookie(): void {
    this.postMessage({
      type: 'spawnCookie',
    });
  }

  public playHeartFill(heartIndex: number): void {
    this.postMessage({
      type: 'playHeartFill',
      heartIndex,
    });
  }

  public toggleBreakPrompt(): void {
    this.postMessage({
      type: 'toggleBreakPrompt',
    });
  }

  private postState(): void {
    const message: BuddyStateMessage = {
      type: 'setState',
      state: this.state,
    };

    this.postMessage(message);
  }

  private postBuddySize(): void {
    this.postMessage({
      type: 'setBuddySize',
      size: this.buddySize,
    });
  }

  private postHealth(): void {
    this.postMessage({
      type: 'setHealth',
      health: this.health,
    });
  }

  private postMessage(message: unknown): void {
    void this.webviewView?.webview.postMessage(message);
  }

  private syncWebviewState(): void {
    this.postHealth();
    this.postState();
    this.postBuddySize();
  }

  private getHtml(
    webview: vscode.Webview,
    spriteSources: Record<SpriteKey, string>,
    imageSources: Record<ImageKey, string>,
  ): string {
    const nonce = getNonce();
    const spriteDisplaySizes = getSpriteDisplaySizes(this.buddySize);
    const health = this.health;
    const shouldPlayIntro = this.shouldPlayIntro && !health.isDead;
    const initialSpriteState: SpriteKey = shouldPlayIntro ? 'spawn' : health.isDead ? 'soul' : this.state;

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
      height: 100vh;
      margin: 0;
      overflow: hidden;
      color: var(--vscode-sideBar-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .shell {
      height: 100vh;
      display: grid;
      align-content: stretch;
      padding: 0;
    }

    .stage {
      display: grid;
      place-items: end center;
      position: relative;
      height: 100vh;
      min-height: 0;
      padding: 8px 0;
      background: transparent;
      overflow: hidden;
    }

    .health-meter {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      gap: 4px;
      align-items: center;
      z-index: 3;
      pointer-events: none;
    }

    .heart {
      display: block;
      width: 18px;
      height: auto;
      image-rendering: pixelated;
      filter: drop-shadow(0 1px 0 rgb(0 0 0 / 24%));
    }

    .heart.is-empty {
      filter: none;
    }

    .life-counter {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 3;
      min-width: 48px;
      padding: 2px 6px;
      border: 1px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-radius: 4px;
      color: var(--vscode-descriptionForeground, var(--vscode-sideBar-foreground));
      background: var(--vscode-sideBar-background);
      box-shadow: 2px 2px 0 rgb(0 0 0 / 18%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      text-transform: uppercase;
      pointer-events: none;
    }

    body[data-intro-phase="spawning"] .frame-stage,
    body[data-death-phase="soul"] .frame-stage,
    body[data-death-phase="reviving"] .frame-stage {
      animation: soul-wander 8s ease-in-out infinite;
      filter: drop-shadow(0 0 10px rgb(144 213 255 / 34%));
      --sprite-lift: 24px;
    }

    body[data-intro-phase="spawning"] .frame-stage,
    body[data-death-phase="reviving"] .frame-stage {
      animation: none;
    }

    body[data-death-phase="rising"] .sprite-image {
      animation: soul-rise 1.1s ease-out both;
    }

    body[data-death-phase="soul"] .sprite-image {
      animation: soul-bob 2.2s ease-in-out infinite;
    }

    body[data-dead="true"] .cookie-treat {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .speech-bubble {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      z-index: 2;
      min-width: 112px;
      max-width: min(180px, calc(100vw - 24px));
      padding: 8px 10px;
      border: 2px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-radius: 4px;
      color: var(--vscode-editorWidget-foreground, var(--vscode-sideBar-foreground));
      background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
      box-shadow:
        0 0 0 1px rgb(0 0 0 / 18%),
        3px 3px 0 rgb(0 0 0 / 24%);
      font-family: "Courier New", "Menlo", "Monaco", monospace;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      text-transform: uppercase;
      text-shadow: 1px 0 0 rgb(0 0 0 / 20%);
      text-rendering: geometricPrecision;
      overflow-wrap: anywhere;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateX(var(--speech-offset-x, -50%)) translateY(4px);
      transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
    }

    .speech-bubble::after {
      content: "";
      position: absolute;
      left: var(--speech-tail-x, 50%);
      bottom: -6px;
      width: 10px;
      height: 10px;
      border-right: 2px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      border-bottom: 2px solid var(--vscode-editorWidget-border, rgb(128 128 128 / 48%));
      background: inherit;
      transform: translateX(-50%) rotate(45deg);
    }

    .speech-bubble[data-visible="true"] {
      opacity: 1;
      visibility: visible;
      transform: translateX(var(--speech-offset-x, -50%)) translateY(0);
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
      width: min(var(--sprite-display-width, ${spriteDisplaySizes[this.state].width}), 100%, calc((100vh - 16px) * var(--sprite-aspect-ratio, ${spriteDisplaySizes[this.state].aspectRatio})));
      aspect-ratio: var(--sprite-aspect-ratio, ${spriteDisplaySizes[this.state].aspectRatio});
      align-self: end;
      transform: translateX(var(--walk-x, 0px));
      margin-bottom: var(--sprite-lift, 0px);
      transition:
        transform var(--walk-duration, 0ms) linear,
        margin-bottom var(--vertical-duration, 0ms) cubic-bezier(0.18, 0.82, 0.26, 1);
      will-change: transform;
      position: relative;
      cursor: pointer;
    }

    .frame-stage:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 3px;
    }

    .sprite-image {
      width: 100%;
      height: auto;
      align-self: end;
      object-fit: contain;
      image-rendering: pixelated;
      translate: 0 var(--sprite-y, 0px);
      transform: scaleX(var(--sprite-direction, 1));
      transform-origin: center bottom;
      transition: translate var(--vertical-duration, 0ms) cubic-bezier(0.18, 0.82, 0.26, 1);
    }

    .cookie-treat {
      position: absolute;
      left: 50%;
      bottom: 8px;
      width: var(--cookie-size, ${baseCookieDisplayWidth}px);
      height: auto;
      image-rendering: pixelated;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(-56px) scale(1);
      transform-origin: center bottom;
      transition: none;
      z-index: 1;
    }

    .cookie-treat[hidden],
    .cookie-treat[data-state="ready"] {
      display: block;
    }

    .cookie-treat[data-state="ready"] {
      opacity: 0;
      visibility: hidden;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(-56px) scale(1);
    }

    .cookie-treat[data-state="dropping"],
    .cookie-treat[data-state="landed"] {
      opacity: 1;
      visibility: visible;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(0) scale(1);
    }

    .cookie-treat[data-state="dropping"] {
      transition: opacity 80ms ease, transform 560ms cubic-bezier(0.18, 0.82, 0.26, 1);
    }

    .cookie-treat[data-state="eaten"] {
      opacity: 0;
      visibility: hidden;
      transform: translateX(calc(var(--cookie-x, 0px) - 50%)) translateY(0) scale(0.72);
      transition: opacity 80ms ease, transform 120ms ease;
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

    @keyframes soul-wander {
      0%, 100% {
        transform: translateX(var(--walk-x, 0px));
      }
      25% {
        transform: translateX(var(--soul-left-x, var(--walk-x, 0px)));
      }
      75% {
        transform: translateX(var(--soul-right-x, var(--walk-x, 0px)));
      }
    }

    @keyframes soul-bob {
      0%, 100% {
        translate: 0 -18px;
      }
      50% {
        translate: 0 -6px;
      }
    }

    @keyframes soul-rise {
      0% {
        translate: 0 18px;
        opacity: 0;
      }
      22% {
        opacity: 1;
      }
      100% {
        translate: 0 -18px;
        opacity: 1;
      }
    }

  </style>
</head>
<body data-state="${this.state}" data-dead="${health.isDead}" data-death-phase="${health.isDead ? 'soul' : 'alive'}" data-intro-phase="${shouldPlayIntro ? 'spawning' : 'done'}">
  <main class="shell">
    <section class="stage" aria-label="Buddy companion">
      <div class="health-meter" aria-label="Buddy health">
        ${renderHearts(shouldPlayIntro ? 0 : health.hearts, imageSources)}
      </div>
      <div class="life-counter" aria-live="polite" aria-label="${getAliveDaysLabel(health)}">${getAliveDayCounterText(health)}</div>
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
      <div class="frame-stage" role="button" tabindex="0" aria-label="Show Buddy love" style="--sprite-display-width: ${spriteDisplaySizes[initialSpriteState].width}; --sprite-aspect-ratio: ${spriteDisplaySizes[initialSpriteState].aspectRatio};">
        <div class="speech-bubble" aria-live="polite" aria-atomic="true"><span></span></div>
        <img class="sprite-image" alt="" src="${spriteSources[initialSpriteState]}" />
      </div>
      <img class="cookie-treat" alt="" src="${imageSources.cookie}" hidden />
    </section>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const spriteSources = ${JSON.stringify(spriteSources)};
    const imageSources = ${JSON.stringify(imageSources)};
    const baseSpriteDisplaySizes = ${JSON.stringify(getSpriteDisplaySizes())};
    const buddySizeScales = ${JSON.stringify(buddySizeScales)};
    const spriteDisplaySizes = ${JSON.stringify(spriteDisplaySizes)};
    const stage = document.querySelector('.stage');
    const healthMeter = document.querySelector('.health-meter');
    const lifeCounter = document.querySelector('.life-counter');
    const spriteImage = document.querySelector('.sprite-image');
    const spriteStage = document.querySelector('.frame-stage');
    const speechBubble = document.querySelector('.speech-bubble');
    const speechBubbleText = speechBubble?.querySelector('span');
    const cookieTreat = document.querySelector('.cookie-treat');
    let buddySize = '${this.buddySize}';
    let lastState = '${this.state}';
    let currentState = '${this.state}';
    let stateBeforeWalk = '${this.state}';
    let walkTimer;
    let walkTransitionTimer;
    let walkTransitionCleanup;
    let clickReactionTimer;
    let cookieDropTimer;
    let cookieEatTimer;
    let deathTimer;
    let reviveTimer;
    let lifeCounterTimer;
    let introTimer;
    let introHeartTimer;
    let breakPromptTimer;
    let breakScrambleTimer;
    let breakHideTimer;
    let walkX = 0;
    let spriteY = 0;
    let walkDirection = 1;
    let cookieX = 0;
    let cookieActive = false;
    let cookieDashSegmentsRemaining = 0;
    let cookiePhase = 'idle';
    let isDead = ${JSON.stringify(health.isDead)};
    let isReviving = false;
    let isIntroPlaying = ${JSON.stringify(shouldPlayIntro)};
    let isBreakPromptActive = false;
    let currentHearts = ${JSON.stringify(health.hearts)};
    let previousHearts = ${JSON.stringify(health.hearts)};
    let currentAliveSince = ${JSON.stringify(health.aliveSince ?? null)};
    let heartLostMessageCount = 0;
    let cookieEatingMessageCount = 0;
    let activeSpeechMessage = 'TAKE A BREAK?';
    let deathPhase = isDead ? 'soul' : 'alive';
    const walkSpeedPxPerSecond = 70;
    const dashSpeedPxPerSecond = 230;
    const walkVisibleWidthRatio = 0.42;
    const dashGifDurationMs = 400;
    const cookieDashMinDistancePx = 1;
    const loveGifDurationMs = 1300;
    const cookieDropMs = 580;
    const eatGifDurationMs = 2000;
    const deathGifDurationMs = 950;
    const soulRiseDurationMs = 1100;
    const reviveGifDurationMs = 900;
    const reviveDropDurationMs = 360;
    const spawnGifDurationMs = 450;
    const spawnDropDurationMs = 360;
    const introHeartPopMs = 260;
    const heartFillDurationMs = 1100;
    const breakPromptIntervalMs = 25 * 60 * 1000;
    const breakPromptScrambleMs = 1800;
    const breakPromptVisibleMs = 9000;
    const statusPromptVisibleMs = 3200;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const breakPromptMessages = [
      'TAKE A BREAK?',
      'SAVE AND STRETCH?',
      'TOUCH GRASS SIDE QUEST?',
      'SNACK? WATER? BOTH?',
      'YOU HAVE BEEN CODING A WHILE.',
      'HYDRATION QUEST!',
      'STEP AWAY A BIT?',
    ];
    const heartLostMessages = [
      'I LOST A HEART',
      'I NEED FOOD',
    ];
    const cookieEatingMessages = [
      'THANK YOU',
      'NOM NOM NOM',
    ];
    const introMessage = "HEY, I'M BUDDY";

    function getSpriteDisplaySize(state) {
      const displaySize = baseSpriteDisplaySizes[state] || baseSpriteDisplaySizes.idle;
      const scale = buddySizeScales[buddySize] || buddySizeScales.default;

      return {
        width: (parseFloat(displaySize.width) * scale) + 'px',
        aspectRatio: displaySize.aspectRatio,
      };
    }

    function getCookieDisplaySize() {
      const scale = buddySizeScales[buddySize] || buddySizeScales.default;
      return Math.round(${baseCookieDisplayWidth} * scale) + 'px';
    }

    function setSpriteForState(state, replay = false) {
      if (!spriteImage || !spriteStage) {
        return;
      }

      const source = spriteSources[state] || spriteSources.idle;
      const displaySize = getSpriteDisplaySize(state);
      spriteStage.style.setProperty('--sprite-display-width', displaySize.width);
      spriteStage.style.setProperty('--sprite-aspect-ratio', displaySize.aspectRatio);
      if (source && (replay || spriteImage.getAttribute('src') !== source)) {
        if (replay) {
          spriteImage.removeAttribute('src');
          void spriteImage.offsetWidth;
        }
        spriteImage.setAttribute('src', source);
      }
    }

    function getVisibleSpriteState() {
      if (isIntroPlaying) {
        return 'spawn';
      }

      if (isReviving || deathPhase === 'reviving') {
        return 'revive';
      }

      if (isDead) {
        return deathPhase === 'dying' ? 'death' : 'soul';
      }

      return document.body.dataset.state || currentState || 'idle';
    }

    function updateCookieSize() {
      if (!cookieTreat) {
        return;
      }

      cookieTreat.style.setProperty('--cookie-size', getCookieDisplaySize());
    }

    function getWalkLimit(useVisibleWalkWidth = false) {
      if (!stage || !spriteStage) {
        return 0;
      }

      const stageWidth = getPanelWidth();
      const spriteWidth = spriteStage.getBoundingClientRect().width * (useVisibleWalkWidth ? walkVisibleWidthRatio : 1);
      return Math.max(0, (stageWidth - spriteWidth) / 2);
    }

    function getPanelWidth() {
      return stage?.getBoundingClientRect().width || window.innerWidth || 0;
    }

    function getSingleDashDistance() {
      const panelWidth = getPanelWidth();
      const timedDistance = dashSpeedPxPerSecond * (dashGifDurationMs / 1000);
      return Math.max(cookieDashMinDistancePx, Math.min(panelWidth, timedDistance));
    }

    function applyWalkPosition(durationMs = 0) {
      if (!spriteStage) {
        return;
      }

      spriteStage.style.setProperty('--walk-duration', durationMs + 'ms');
      spriteStage.style.setProperty('--walk-x', walkX + 'px');
      spriteStage.style.setProperty('--sprite-direction', String(walkDirection));
      updateSoulWanderBounds();
    }

    function applySpriteY(durationMs = 0) {
      spriteImage?.style.setProperty('--vertical-duration', durationMs + 'ms');
      spriteStage?.style.setProperty('--vertical-duration', durationMs + 'ms');
      spriteImage?.style.setProperty('--sprite-y', spriteY + 'px');
    }

    function updateSoulWanderBounds() {
      if (!spriteStage || deathPhase !== 'soul') {
        return;
      }

      const limit = getWalkLimit(true);
      const wanderDistance = Math.min(26, limit);
      const leftX = Math.max(-limit, walkX - wanderDistance);
      const rightX = Math.min(limit, walkX + wanderDistance);
      spriteStage.style.setProperty('--soul-left-x', leftX + 'px');
      spriteStage.style.setProperty('--soul-right-x', rightX + 'px');
    }

    function applyCookiePosition() {
      cookieTreat?.style.setProperty('--cookie-x', cookieX + 'px');
    }

    function setCookieState(state) {
      if (!cookieTreat) {
        return;
      }

      cookieTreat.dataset.state = state;
      cookieTreat.hidden = false;
    }

    function clearIntroTimer() {
      if (introTimer) {
        clearTimeout(introTimer);
        introTimer = undefined;
      }

      if (introHeartTimer) {
        clearTimeout(introHeartTimer);
        introHeartTimer = undefined;
      }
    }

    function updateSpeechBubblePosition() {
      if (!stage || !speechBubble) {
        return;
      }

      speechBubble.style.setProperty('--speech-offset-x', '-50%');
      speechBubble.style.setProperty('--speech-tail-x', '50%');

      requestAnimationFrame(() => {
        const stageRect = stage.getBoundingClientRect();
        const padding = 8;
        const stageCenterX = stageRect.left + stageRect.width / 2;
        const buddyCenterX = stageCenterX + walkX;
        const bubbleWidth = speechBubble.getBoundingClientRect().width;
        const leftOffset = stageRect.left + padding - buddyCenterX;
        const rightOffset = stageRect.right - padding - bubbleWidth - buddyCenterX;
        const centeredOffset = -bubbleWidth / 2;
        const offsetX = Math.min(Math.max(centeredOffset, leftOffset), rightOffset);
        const tailX = Math.min(bubbleWidth - 12, Math.max(12, -offsetX));

        speechBubble.style.setProperty('--speech-offset-x', offsetX + 'px');
        speechBubble.style.setProperty('--speech-tail-x', tailX + 'px');
      });
    }

    function chooseMessage(messages) {
      return messages[Math.floor(Math.random() * messages.length)] || messages[0] || '';
    }

    function getSpeechLetterCount(message = activeSpeechMessage) {
      return Array.from(message).filter((character) => character !== ' ').length;
    }

    function getScrambledSpeechGlyph() {
      const glyphs = '#%*+=?<>/[]{}~';
      return glyphs[Math.floor(Math.random() * glyphs.length)];
    }

    function getDecodedSpeechText(revealedLetters, message = activeSpeechMessage) {
      let letterIndex = 0;
      return Array.from(message, (character) => {
        if (character === ' ') {
          return ' ';
        }

        letterIndex += 1;
        return letterIndex <= revealedLetters ? character : getScrambledSpeechGlyph();
      }).join('');
    }

    function hideBreakPrompt() {
      isBreakPromptActive = false;

      if (breakScrambleTimer) {
        clearInterval(breakScrambleTimer);
        breakScrambleTimer = undefined;
      }

      if (breakHideTimer) {
        clearTimeout(breakHideTimer);
        breakHideTimer = undefined;
      }

      if (!speechBubble || !speechBubbleText) {
        return;
      }

      speechBubble.dataset.visible = 'false';
      speechBubbleText.textContent = '';
      speechBubble.style.setProperty('--speech-offset-x', '-50%');
      speechBubble.style.setProperty('--speech-tail-x', '50%');
    }

    function clearBreakPromptTimer() {
      if (breakPromptTimer) {
        clearTimeout(breakPromptTimer);
        breakPromptTimer = undefined;
      }
    }

    function playIntroHearts(nextHeart = 1) {
      renderHearts(Math.min(currentHearts, nextHeart));

      if (nextHeart >= currentHearts) {
        introHeartTimer = undefined;
        return;
      }

      introHeartTimer = setTimeout(() => {
        playIntroHearts(nextHeart + 1);
      }, introHeartPopMs);
    }

    function playIntroSequence() {
      if (!isIntroPlaying || isDead) {
        return;
      }

      clearIntroTimer();
      clearClickReaction();
      clearRandomWalk();
      resetCookie();
      renderHearts(0);
      setSpriteForState('spawn');
      document.body.dataset.introPhase = 'spawning';

      introTimer = setTimeout(() => {
        introTimer = undefined;
        if (!isIntroPlaying || isDead) {
          return;
        }

        preserveSpritePosition(() => {
          currentState = 'idle';
          document.body.dataset.state = 'idle';
          setSpriteForState('idle');
        });

        waitForSpriteImage(() => {
          if (!isIntroPlaying || isDead) {
            return;
          }

          requestAnimationFrame(() => {
            document.body.dataset.introPhase = 'done';
            spriteY = 0;
            applySpriteY(spawnDropDurationMs);

            introTimer = setTimeout(() => {
              introTimer = undefined;
              if (!isIntroPlaying || isDead) {
                return;
              }

              playIntroHearts();
              showSpeechMessage(introMessage, {
                lockBuddy: false,
                scheduleNextBreak: false,
                visibleMs: 5000,
              });
              isIntroPlaying = false;
              vscode.postMessage({ type: 'introPlayed' });
              scheduleBreakPrompt(true);
              scheduleRandomWalk();
            }, spawnDropDurationMs);
          });
        });
      }, spawnGifDurationMs);
    }

    function scheduleBreakPrompt(reset = false) {
      if (reset) {
        clearBreakPromptTimer();
      }

      if (breakPromptTimer || isDead || isReviving) {
        return;
      }

      breakPromptTimer = setTimeout(() => {
        breakPromptTimer = undefined;
        showBreakPrompt();
      }, breakPromptIntervalMs);
    }

    function dismissBreakPrompt() {
      const wasPromptVisible = isBreakPromptActive;

      hideBreakPrompt();
      if (wasPromptVisible) {
        scheduleBreakPrompt(true);
      }
    }

    function showSpeechMessage(message, options = {}) {
      if (!speechBubble || !speechBubbleText) {
        if (options.scheduleNextBreak) {
          scheduleBreakPrompt(true);
        }
        return;
      }

      if (isDead || isReviving || (options.lockBuddy && isCookieInteractionActive())) {
        if (options.scheduleNextBreak) {
          scheduleBreakPrompt(true);
        }
        return;
      }

      hideBreakPrompt();
      activeSpeechMessage = message;
      isBreakPromptActive = Boolean(options.lockBuddy);

      if (options.lockBuddy) {
        clearClickReaction();
        clearRandomWalk();
        currentState = 'idle';
        document.body.dataset.state = 'idle';
        setSpriteForState('idle');
        applyWalkPosition(0);
      }

      speechBubble.dataset.visible = 'true';
      speechBubbleText.textContent = getDecodedSpeechText(0);
      updateSpeechBubblePosition();

      if (breakScrambleTimer) {
        clearInterval(breakScrambleTimer);
      }

      const startedAt = Date.now();
      const totalLetters = getSpeechLetterCount();
      breakScrambleTimer = setInterval(() => {
        const elapsedMs = Date.now() - startedAt;
        const revealedLetters = Math.min(totalLetters, Math.floor((elapsedMs / breakPromptScrambleMs) * (totalLetters + 1)));
        speechBubbleText.textContent = getDecodedSpeechText(revealedLetters);
        updateSpeechBubblePosition();

        if (revealedLetters < totalLetters) {
          return;
        }

        if (breakScrambleTimer) {
          clearInterval(breakScrambleTimer);
          breakScrambleTimer = undefined;
        }

        speechBubbleText.textContent = activeSpeechMessage;
        updateSpeechBubblePosition();
        breakHideTimer = setTimeout(() => {
          const shouldScheduleWalk = isBreakPromptActive;
          hideBreakPrompt();
          if (options.scheduleNextBreak) {
            scheduleBreakPrompt(true);
          }
          if (shouldScheduleWalk) {
            scheduleRandomWalk();
          }
        }, options.visibleMs ?? statusPromptVisibleMs);
      }, 90);
    }

    function showBreakPrompt() {
      showSpeechMessage(chooseMessage(breakPromptMessages), {
        lockBuddy: true,
        scheduleNextBreak: true,
        visibleMs: breakPromptVisibleMs,
      });
    }

    function showStatusSpeechMessage(messages) {
      if (isBreakPromptActive) {
        return;
      }

      showSpeechMessage(chooseMessage(messages), {
        lockBuddy: false,
        scheduleNextBreak: false,
        visibleMs: statusPromptVisibleMs,
      });
    }

    function shouldShowEveryOtherStatusMessage(count) {
      return count % 2 === 1;
    }

    function toggleBreakPrompt() {
      if (isBreakPromptActive) {
        dismissBreakPrompt();
        return;
      }

      clearBreakPromptTimer();
      showBreakPrompt();
    }

    function renderHearts(hearts) {
      if (!healthMeter) {
        return;
      }

      healthMeter.replaceChildren();
      for (let index = 0; index < ${maxBuddyHearts}; index += 1) {
        const heart = document.createElement('img');
        const isEmpty = index >= hearts;
        heart.className = 'heart' + (isEmpty ? ' is-empty' : '');
        heart.setAttribute('src', isEmpty ? imageSources.heartEmpty : imageSources.heart);
        heart.setAttribute('alt', '');
        heart.setAttribute('aria-hidden', 'true');
        healthMeter.appendChild(heart);
      }
    }

    function getAliveDays(aliveSince) {
      if (typeof aliveSince !== 'number' || !Number.isFinite(aliveSince)) {
        return 0;
      }

      return Math.max(1, Math.floor((Date.now() - aliveSince) / oneDayMs) + 1);
    }

    function updateLifeCounter() {
      if (!lifeCounter) {
        return;
      }

      const days = isDead ? 0 : getAliveDays(currentAliveSince);
      lifeCounter.textContent = 'Day ' + days;
      lifeCounter.setAttribute(
        'aria-label',
        days === 1 ? 'Buddy has been alive for 1 day' : 'Buddy has been alive for ' + days + ' days',
      );
    }

    function scheduleLifeCounterTick() {
      clearLifeCounterTick();

      if (isDead) {
        return;
      }

      lifeCounterTimer = setInterval(updateLifeCounter, 60 * 1000);
    }

    function clearLifeCounterTick() {
      if (lifeCounterTimer) {
        clearInterval(lifeCounterTimer);
        lifeCounterTimer = undefined;
      }
    }

    function setHealth(health) {
      const hearts = Math.max(0, Math.min(${maxBuddyHearts}, Number(health?.hearts) || 0));
      const wasDead = isDead;
      const healthDidChange = hearts !== currentHearts || Boolean(health?.isDead || hearts <= 0) !== isDead;
      const lostHeart = hearts < previousHearts;
      const aliveSince = Number(health?.aliveSince);
      currentHearts = hearts;
      previousHearts = hearts;
      isDead = Boolean(health?.isDead || hearts <= 0);
      currentAliveSince = Number.isFinite(aliveSince) ? aliveSince : isDead ? null : currentAliveSince || Date.now();
      document.body.dataset.dead = String(isDead);
      healthMeter?.setAttribute('aria-label', isDead ? 'Buddy has no hearts left' : 'Buddy has ' + hearts + ' hearts');
      updateLifeCounter();

      if (isIntroPlaying && !isDead) {
        scheduleLifeCounterTick();
        return;
      }

      renderHearts(hearts);

      if (isDead) {
        clearIntroTimer();
        isIntroPlaying = false;
        document.body.dataset.introPhase = 'done';
        clearBreakPromptTimer();
        clearLifeCounterTick();
        hideBreakPrompt();
        clearReviveTimer();
        isReviving = false;
        spriteY = 0;
        applySpriteY(0);
        clearClickReaction();
        resetCookie();
        clearRandomWalk();
        if (!healthDidChange && deathPhase === 'soul') {
          setSpriteForState('soul');
          setDeathPhase('soul');
          return;
        }

        playDeathSequence(!wasDead);
      } else {
        clearDeathTimer();
        if (wasDead) {
          playReviveSequence();
          return;
        }

        setDeathPhase('alive');
        scheduleLifeCounterTick();
        if (lostHeart) {
          heartLostMessageCount += 1;
          if (shouldShowEveryOtherStatusMessage(heartLostMessageCount)) {
            showStatusSpeechMessage(heartLostMessages);
          }
        }

        if (isCookieInteractionActive()) {
          return;
        }

        setSpriteForState(currentState);
        scheduleBreakPrompt();
        scheduleRandomWalk();
      }
    }

    function setDeathPhase(phase) {
      deathPhase = phase;
      document.body.dataset.deathPhase = phase;
      updateSoulWanderBounds();
    }

    function clearDeathTimer() {
      if (deathTimer) {
        clearTimeout(deathTimer);
        deathTimer = undefined;
      }
    }

    function clearReviveTimer() {
      if (reviveTimer) {
        clearTimeout(reviveTimer);
        reviveTimer = undefined;
      }
    }

    function playDeathSequence(shouldPlayDeathAnimation) {
      clearDeathTimer();

      if (!shouldPlayDeathAnimation) {
        preserveSpriteCenter(() => {
          setSpriteForState('soul');
        });
        setDeathPhase('soul');
        return;
      }

      setDeathPhase('dying');
      preserveSpriteCenter(() => {
        setSpriteForState('death');
      });
      deathTimer = setTimeout(() => {
        deathTimer = undefined;
        if (!isDead) {
          return;
        }

        preserveSpriteCenter(() => {
          setSpriteForState('soul');
        });
        setDeathPhase('rising');
        deathTimer = setTimeout(() => {
          deathTimer = undefined;
          if (!isDead) {
            return;
          }

          setDeathPhase('soul');
        }, soulRiseDurationMs);
      }, deathGifDurationMs);
    }

    function playReviveSequence() {
      clearDeathTimer();
      clearReviveTimer();
      clearBreakPromptTimer();
      hideBreakPrompt();
      clearClickReaction();
      resetCookie();
      clearRandomWalk();
      isReviving = true;
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      captureWalkPosition();

      preserveSpritePosition(() => {
        setDeathPhase('reviving');
        setSpriteForState('revive');
      });

      reviveTimer = setTimeout(() => {
        reviveTimer = undefined;
        if (isDead) {
          isReviving = false;
          return;
        }

        preserveSpritePosition(() => {
          currentState = 'idle';
          document.body.dataset.state = 'idle';
          setSpriteForState('idle');
        });

        waitForSpriteImage(() => {
          if (isDead) {
            isReviving = false;
            return;
          }

          requestAnimationFrame(() => {
            setDeathPhase('alive');
            spriteY = 0;
            applySpriteY(reviveDropDurationMs);

            reviveTimer = setTimeout(() => {
              reviveTimer = undefined;
              isReviving = false;
              applySpriteY(0);
              scheduleBreakPrompt(true);
              scheduleRandomWalk();
            }, reviveDropDurationMs);
          });
        });
      }, reviveGifDurationMs);
    }

    function playHeartFill(heartIndex) {
      if (!healthMeter) {
        return;
      }

      const heart = healthMeter.querySelectorAll('.heart')[heartIndex];
      if (!(heart instanceof HTMLImageElement)) {
        return;
      }

      heart.classList.remove('is-empty');
      heart.setAttribute('src', imageSources.heartFill);
      setTimeout(() => {
        heart.setAttribute('src', imageSources.heart);
      }, heartFillDurationMs);
    }

    function captureWalkPosition() {
      if (!spriteStage) {
        return;
      }

      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        const spriteRect = spriteStage.getBoundingClientRect();
        walkX = spriteRect.left + spriteRect.width / 2 - (stageRect.left + stageRect.width / 2);
      } else {
        const transform = getComputedStyle(spriteStage).transform;
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrixReadOnly(transform);
          walkX = matrix.m41;
        }
      }

      applyWalkPosition(0);
    }

    function getSpriteCenterX() {
      if (!spriteImage) {
        return undefined;
      }

      const rect = spriteImage.getBoundingClientRect();
      return rect.left + rect.width / 2;
    }

    function getSpriteBottom() {
      if (!spriteImage) {
        return undefined;
      }

      return spriteImage.getBoundingClientRect().bottom;
    }

    function preserveSpriteCenter(callback) {
      const previousCenter = getSpriteCenterX();
      callback();

      if (previousCenter === undefined) {
        return;
      }

      const adjustPosition = () => {
        const nextCenter = getSpriteCenterX();
        if (nextCenter === undefined) {
          return;
        }

        walkX += previousCenter - nextCenter;
        applyWalkPosition(0);
        clampWalkPosition();
      };

      requestAnimationFrame(adjustPosition);
      spriteImage?.addEventListener('load', adjustPosition, { once: true });
    }

    function preserveSpritePosition(callback) {
      const previousCenter = getSpriteCenterX();
      const previousBottom = getSpriteBottom();
      callback();

      if (previousCenter === undefined && previousBottom === undefined) {
        return;
      }

      let didAdjust = false;
      const adjustPosition = () => {
        if (didAdjust) {
          return;
        }
        didAdjust = true;

        if (previousCenter !== undefined) {
          const nextCenter = getSpriteCenterX();
          if (nextCenter !== undefined) {
            walkX += previousCenter - nextCenter;
            applyWalkPosition(0);
            clampWalkPosition();
          }
        }

        if (previousBottom !== undefined) {
          const nextBottom = getSpriteBottom();
          if (nextBottom !== undefined) {
            spriteY += previousBottom - nextBottom;
            applySpriteY(0);
          }
        }
      };

      if (spriteImage && !spriteImage.complete) {
        spriteImage.addEventListener('load', adjustPosition, { once: true });
        spriteImage.addEventListener('error', adjustPosition, { once: true });
      } else {
        requestAnimationFrame(adjustPosition);
      }
    }

    function waitForSpriteImage(callback) {
      if (!spriteImage || spriteImage.complete) {
        requestAnimationFrame(callback);
        return;
      }

      const handleReady = () => {
        requestAnimationFrame(callback);
      };
      spriteImage.addEventListener('load', handleReady, { once: true });
      spriteImage.addEventListener('error', handleReady, { once: true });
    }

    function clampWalkPosition(captureCurrentPosition = false) {
      if (captureCurrentPosition) {
        captureWalkPosition();
      }

      const limit = getWalkLimit(true);
      walkX = Math.min(limit, Math.max(-limit, walkX));
      applyWalkPosition(0);
    }

    function clearWalkTransition() {
      if (walkTransitionTimer) {
        clearTimeout(walkTransitionTimer);
        walkTransitionTimer = undefined;
      }

      if (walkTransitionCleanup) {
        walkTransitionCleanup();
        walkTransitionCleanup = undefined;
      }
    }

    function clearRandomWalk() {
      if (walkTimer) {
        clearTimeout(walkTimer);
        walkTimer = undefined;
      }

      clearWalkTransition();

      captureWalkPosition();
    }

    function clearClickReaction() {
      if (clickReactionTimer) {
        clearTimeout(clickReactionTimer);
        clickReactionTimer = undefined;
      }
    }

    function clearCookieEatTimer() {
      if (cookieDropTimer) {
        clearTimeout(cookieDropTimer);
        cookieDropTimer = undefined;
      }

      if (cookieEatTimer) {
        clearTimeout(cookieEatTimer);
        cookieEatTimer = undefined;
      }
    }

    function resetCookie() {
      clearCookieEatTimer();
      cookieActive = false;
      cookieDashSegmentsRemaining = 0;
      cookiePhase = 'idle';

      if (!cookieTreat) {
        return;
      }

      cookieTreat.hidden = true;
      cookieTreat.removeAttribute('data-state');
    }

    function isCookieInteractionActive() {
      return cookiePhase !== 'idle';
    }

    function scheduleRandomWalk() {
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || walkTimer || (currentState !== 'idle' && currentState !== 'sleeping')) {
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
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || !spriteImage || !spriteStage || (currentState !== 'idle' && currentState !== 'sleeping')) {
        scheduleRandomWalk();
        return;
      }

      if (!spriteSources.walk) {
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
      setSpriteForState('walk');
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

    function spawnCookie() {
      if (!cookieTreat) {
        return;
      }

      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
        return;
      }

      clearClickReaction();
      dismissBreakPrompt();
      clearCookieEatTimer();
      clearRandomWalk();
      const limit = getWalkLimit(true);
      cookieX = walkX <= 0 ? Math.max(0, limit - 12) : -Math.max(0, limit - 12);
      cookieActive = true;
      cookieDashSegmentsRemaining = 0;
      cookiePhase = 'dropping';
      applyCookiePosition();
      setCookieState('ready');
      void cookieTreat.offsetWidth;

      requestAnimationFrame(() => {
        setCookieState('dropping');
        cookieDropTimer = setTimeout(() => {
          cookieDropTimer = undefined;
          setCookieState('landed');
          cookieDashSegmentsRemaining = getCookieDashSegmentCount(Math.abs(cookieX - walkX));
          startCookieWalk();
        }, cookieDropMs);
      });
    }

    function getCookieDashSegmentCount(distance) {
      if (!spriteSources.dash || !spriteSources.dashContinue || distance <= cookieDashMinDistancePx) {
        return 0;
      }

      return Math.max(1, Math.ceil(distance / getSingleDashDistance()));
    }

    function canDashToCookie(distance) {
      return Boolean(spriteSources.dash && spriteSources.dashContinue && distance > cookieDashMinDistancePx);
    }

    function getCookieMovementPlan(distance) {
      const shouldDash = canDashToCookie(distance) && cookieDashSegmentsRemaining > 0;

      if (!shouldDash) {
        return {
          state: 'walk',
          targetX: cookieX,
          durationMs: Math.max(700, Math.round((distance / walkSpeedPxPerSecond) * 1000)),
        };
      }

      const isFinalDash = cookieDashSegmentsRemaining <= 1;
      const dashDistance = isFinalDash ? distance : distance / cookieDashSegmentsRemaining;

      return {
        state: isFinalDash ? 'dash' : 'dashContinue',
        targetX: walkX + walkDirection * dashDistance,
        durationMs: dashGifDurationMs,
      };
    }

    function startCookieWalk(preserveReturnState = false) {
      if (!spriteStage || !spriteImage || !cookieActive) {
        return;
      }

      clearWalkTransition();
      if (!preserveReturnState) {
        stateBeforeWalk = currentState;
      }
      cookiePhase = 'walking';
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      walkDirection = cookieX >= walkX ? 1 : -1;
      const distanceToCookie = Math.abs(cookieX - walkX);
      if (canDashToCookie(distanceToCookie) && cookieDashSegmentsRemaining <= 0) {
        cookieDashSegmentsRemaining = getCookieDashSegmentCount(distanceToCookie);
      }
      const movementPlan = getCookieMovementPlan(distanceToCookie);
      preserveSpriteCenter(() => {
        setSpriteForState(movementPlan.state, movementPlan.state === 'dashContinue');
      });
      applyWalkPosition(0);
      void spriteStage.offsetWidth;

      waitForSpriteImage(() => {
        if (!cookieActive || cookiePhase !== 'walking') {
          return;
        }

        applyWalkPosition(0);
        void spriteStage.offsetWidth;

        const distance = Math.abs(cookieX - walkX);
        if (canDashToCookie(distance) && cookieDashSegmentsRemaining <= 0) {
          cookieDashSegmentsRemaining = getCookieDashSegmentCount(distance);
        }
        const activeMovementPlan = getCookieMovementPlan(distance);
        const completeCookieWalk = () => {
          if (!cookieActive || cookiePhase !== 'walking') {
            return;
          }

          if (walkTransitionTimer) {
            clearTimeout(walkTransitionTimer);
            walkTransitionTimer = undefined;
          }

          if (walkTransitionCleanup) {
            walkTransitionCleanup();
            walkTransitionCleanup = undefined;
          }

          cookieDashSegmentsRemaining = Math.max(0, cookieDashSegmentsRemaining - 1);

          if (Math.abs(cookieX - walkX) <= 1) {
            eatCookie();
          } else {
            startCookieWalk(true);
          }
        };
        const handleWalkTransitionEnd = (event) => {
          if (event.target === spriteStage && event.propertyName === 'transform') {
            completeCookieWalk();
          }
        };
        walkTransitionCleanup = () => {
          spriteStage.removeEventListener('transitionend', handleWalkTransitionEnd);
        };

        spriteStage.addEventListener('transitionend', handleWalkTransitionEnd);
        walkTransitionTimer = setTimeout(completeCookieWalk, activeMovementPlan.durationMs + 250);
        walkX = activeMovementPlan.targetX;
        applyWalkPosition(activeMovementPlan.durationMs);
      });
    }

    function eatCookie() {
      if (!cookieTreat) {
        return;
      }

      cookieActive = false;
      cookiePhase = 'eating';
      setCookieState('eaten');
      currentState = 'idle';
      document.body.dataset.state = 'idle';
      setSpriteForState('eat');
      applyWalkPosition(0);
      cookieEatingMessageCount += 1;
      if (shouldShowEveryOtherStatusMessage(cookieEatingMessageCount)) {
        showStatusSpeechMessage(cookieEatingMessages);
      }

      cookieEatTimer = setTimeout(() => {
        cookiePhase = 'loving';
        vscode.postMessage({ type: 'cookieEaten' });
        setSpriteForState('love');

        cookieEatTimer = setTimeout(() => {
          cookieEatTimer = undefined;
          cookiePhase = 'idle';
          currentState = stateBeforeWalk === 'sleeping' ? 'idle' : stateBeforeWalk;
          document.body.dataset.state = currentState;
          setSpriteForState(currentState);
          scheduleBreakPrompt(true);
          scheduleRandomWalk();
        }, loveGifDurationMs);
      }, eatGifDurationMs);
    }

    function setBuddySize(size) {
      preserveSpriteCenter(() => {
        buddySize = buddySizeScales[size] ? size : 'default';
        vscode.setState({
          state: document.body.dataset.state || 'idle',
          buddySize,
        });
        setSpriteForState(getVisibleSpriteState());
        updateCookieSize();
      });
    }

    function setState(state) {
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive) {
        lastState = state;
        return;
      }

      if (isCookieInteractionActive()) {
        stateBeforeWalk = state;
        vscode.setState({ state, buddySize });
        lastState = state;
        return;
      }

      clearClickReaction();
      dismissBreakPrompt();
      clearRandomWalk();
      currentState = state;
      document.body.dataset.state = state;
      vscode.setState({ state, buddySize });
      setSpriteForState(state);
      scheduleRandomWalk();
      lastState = state;
    }

    function triggerBuddyClick() {
      if (isDead || isReviving || isIntroPlaying || isBreakPromptActive || isCookieInteractionActive()) {
        return;
      }

      clearClickReaction();
      dismissBreakPrompt();
      preserveSpriteCenter(() => {
        clearRandomWalk();
        setSpriteForState('love');
      });
      clickReactionTimer = setTimeout(() => {
        clickReactionTimer = undefined;
        preserveSpriteCenter(() => {
          setSpriteForState(currentState);
        });
        scheduleRandomWalk();
      }, loveGifDurationMs);
    }

    spriteStage?.addEventListener('click', triggerBuddyClick);
    spriteStage?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerBuddyClick();
      }
    });
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'setState') {
        setState(message.state);
      } else if (message.type === 'setBuddySize') {
        setBuddySize(message.size);
      } else if (message.type === 'setHealth') {
        setHealth(message.health);
      } else if (message.type === 'playHeartFill') {
        playHeartFill(message.heartIndex);
      } else if (message.type === 'spawnCookie') {
        spawnCookie();
      } else if (message.type === 'toggleBreakPrompt') {
        toggleBreakPrompt();
      }
    });

    if (isIntroPlaying) {
      playIntroSequence();
    } else {
      setHealth(${JSON.stringify(health)});
    }
    updateLifeCounter();
    scheduleLifeCounterTick();
    updateCookieSize();
    clampWalkPosition();
    window.addEventListener('resize', () => {
      const shouldResumeCookieWalk = cookiePhase === 'walking';
      clampWalkPosition(true);
      if (cookieActive) {
        const limit = getWalkLimit(true);
        cookieX = Math.min(limit, Math.max(-limit, cookieX));
        applyCookiePosition();
      }
      if (shouldResumeCookieWalk) {
        cookieDashSegmentsRemaining = getCookieDashSegmentCount(Math.abs(cookieX - walkX));
        startCookieWalk(true);
      }
      if (speechBubble?.dataset.visible === 'true') {
        updateSpeechBubblePosition();
      }
    });
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
    idle: 'idle-trim.gif',
    typing: 'think-trim.gif',
    searching: 'search-trim.gif',
    thinking: 'think-trim.gif',
    sleeping: 'sleep-trim.gif',
    happy: 'happy-trim.gif',
    jump: 'jump-trim.gif',
    walk: 'walk-trim.gif',
    dash: 'dash-trim.gif',
    dashContinue: 'dash-continue-trim.gif',
    love: 'love-trim.gif',
    eat: 'eat-trim.gif',
    death: 'death-trim.gif',
    soul: 'soul-trim.gif',
    revive: 'revive-trim.gif',
    spawn: 'spawn-trim.gif',
  };

  return Object.fromEntries(
    Object.entries(spriteFiles).map(([state, file]) => [
      state,
      webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'images', file)).toString(),
    ]),
  ) as Record<SpriteKey, string>;
}

function getImageSources(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
): Record<ImageKey, string> {
  const imageFiles: Record<ImageKey, string> = {
    cookie: 'cookie-trim.gif',
    heart: 'heart-trim.gif',
    heartEmpty: 'heart-empty-trim.gif',
    heartFill: 'heart-fill-trim.gif',
  };

  return Object.fromEntries(
    Object.entries(imageFiles).map(([key, file]) => [
      key,
      webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'assets', 'images', file)).toString(),
    ]),
  ) as Record<ImageKey, string>;
}

function renderHearts(hearts: number, imageSources: Record<ImageKey, string>): string {
  return Array.from({ length: maxBuddyHearts }, (_, index) => {
    const isEmpty = index >= hearts;
    const className = isEmpty ? 'heart is-empty' : 'heart';
    const source = isEmpty ? imageSources.heartEmpty : imageSources.heart;
    return `<img class="${className}" src="${source}" alt="" aria-hidden="true" />`;
  }).join('');
}

function getAliveDayCounterText(health: BuddyHealth): string {
  return `Day ${health.isDead ? 0 : health.aliveDays}`;
}

function getAliveDaysLabel(health: BuddyHealth): string {
  const days = health.isDead ? 0 : health.aliveDays;

  return days === 1 ? 'Buddy has been alive for 1 day' : `Buddy has been alive for ${days} days`;
}

function getSpriteDisplaySizes(size: BuddySize = 'default'): Record<SpriteKey, { width: string; aspectRatio: string }> {
  const scale = buddySizeScales[size] ?? buddySizeScales.default;

  return Object.fromEntries(
    Object.entries(spriteTrimSizes).map(([state, size]) => [
      state,
      {
        width: `${(size.width / baseSpriteCanvasWidth) * baseSpriteDisplayWidth * scale}px`,
        aspectRatio: String(size.width / size.height),
      },
    ]),
  ) as Record<SpriteKey, { width: string; aspectRatio: string }>;
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
