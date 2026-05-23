import * as vscode from 'vscode';

import { DocFoxState, DocFoxStateMessage, getDocFoxStateLabel } from './stateManager';

export class DocFoxProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'docfox.companion';

  private webviewView?: vscode.WebviewView;
  private state: DocFoxState = 'idle';

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);
    this.postState();
  }

  public setState(state: DocFoxState): void {
    this.state = state;
    this.postState();
  }

  private postState(): void {
    const message: DocFoxStateMessage = {
      type: 'setState',
      state: this.state,
    };

    void this.webviewView?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>DocFox</title>
  <style nonce="${nonce}">
    :root {
      --space-blue: #90d5ff;
      --panel: color-mix(in srgb, var(--vscode-sideBar-background) 88%, var(--space-blue));
      --line: color-mix(in srgb, var(--vscode-sideBar-foreground) 18%, transparent);
      --fox: #ff7f28;
      --fox-dark: #bb4d20;
      --cream: #ffe1bd;
      --hoodie: #8fd8ff;
      --hoodie-dark: #4c97c4;
      --ink: #171a22;
      --outline: #12151d;
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
      min-height: 250px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      overflow: hidden;
      transition: background-color 160ms ease, border-color 160ms ease;
    }

    .fox {
      position: relative;
      width: 176px;
      height: 174px;
      animation: breathe 2.8s ease-in-out infinite;
      transition: filter 160ms ease, transform 160ms ease;
      image-rendering: pixelated;
    }

    .ear {
      position: absolute;
      top: 6px;
      width: 54px;
      height: 68px;
      background: var(--outline);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
      transform-origin: 50% 100%;
      z-index: 3;
    }

    .ear.left {
      left: 38px;
      rotate: -20deg;
      animation: ear-twitch 5.5s ease-in-out infinite;
    }

    .ear.right {
      right: 38px;
      rotate: 20deg;
      animation: ear-twitch 5.5s ease-in-out infinite reverse;
    }

    .ear::after {
      content: "";
      position: absolute;
      left: 8px;
      top: 10px;
      width: 38px;
      height: 50px;
      background: linear-gradient(135deg, var(--fox) 0 42%, var(--cream) 43% 100%);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
      opacity: 0.9;
    }

    .tail {
      position: absolute;
      right: 1px;
      top: 73px;
      width: 60px;
      height: 88px;
      border: 6px solid var(--outline);
      border-radius: 24px 58px 32px 48px;
      background: var(--fox);
      transform: rotate(9deg);
      z-index: 0;
      box-shadow: inset -8px -10px 0 rgb(0 0 0 / 12%);
    }

    .tail::after {
      content: "";
      position: absolute;
      right: -4px;
      top: -5px;
      width: 29px;
      height: 36px;
      border-radius: 55% 45% 40% 50%;
      background: white;
      clip-path: polygon(25% 0, 100% 0, 100% 65%, 64% 100%, 36% 72%, 0 86%);
    }

    .body {
      position: absolute;
      left: 48px;
      top: 105px;
      width: 80px;
      height: 56px;
      border: 6px solid var(--outline);
      border-radius: 16px 16px 12px 12px;
      background: linear-gradient(180deg, var(--hoodie) 0 72%, var(--hoodie-dark) 73% 100%);
      z-index: 1;
    }

    .body::before,
    .body::after {
      content: "";
      position: absolute;
      top: 5px;
      width: 16px;
      height: 48px;
      border-radius: 12px;
      background: var(--hoodie);
      box-shadow: inset 0 -8px 0 var(--hoodie-dark);
    }

    .body::before {
      left: -8px;
      transform: rotate(6deg);
    }

    .body::after {
      right: -8px;
      transform: rotate(-6deg);
    }

    .hood {
      position: absolute;
      left: 43px;
      top: 89px;
      width: 90px;
      height: 38px;
      border: 6px solid var(--outline);
      border-bottom: 0;
      border-radius: 22px 22px 8px 8px;
      background: var(--hoodie);
      z-index: 1;
    }

    .hood::before,
    .hood::after {
      content: "";
      position: absolute;
      top: 19px;
      width: 3px;
      height: 30px;
      background: var(--outline);
    }

    .hood::before {
      left: 27px;
    }

    .hood::after {
      right: 27px;
    }

    .head {
      position: absolute;
      left: 30px;
      top: 50px;
      width: 116px;
      height: 78px;
      border: 6px solid var(--outline);
      border-radius: 34% 34% 42% 42%;
      background: var(--fox);
      box-shadow: inset 0 -10px 0 rgb(0 0 0 / 8%);
      z-index: 4;
    }

    .head::before,
    .head::after {
      content: "";
      position: absolute;
      top: 39px;
      width: 22px;
      height: 17px;
      background: var(--fox);
      border: 5px solid var(--outline);
      border-radius: 8px;
      z-index: -1;
    }

    .head::before {
      left: -19px;
      transform: rotate(-8deg);
    }

    .head::after {
      right: -19px;
      transform: rotate(8deg);
    }

    .cheek {
      position: absolute;
      bottom: -1px;
      width: 62px;
      height: 43px;
      background: var(--cream);
      border-radius: 44% 44% 34% 34%;
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
      top: 27px;
      width: 10px;
      height: 13px;
      border-radius: 50%;
      background: var(--ink);
      animation: blink 4.2s infinite;
      z-index: 2;
    }

    .eye.left {
      left: 33px;
    }

    .eye.right {
      right: 33px;
    }

    .nose {
      position: absolute;
      left: 45px;
      top: 48px;
      width: 15px;
      height: 11px;
      border-radius: 50% 50% 60% 60%;
      background: var(--ink);
      z-index: 3;
    }

    .mouth {
      position: absolute;
      left: 52px;
      top: 58px;
      width: 12px;
      height: 10px;
      border-right: 3px solid var(--ink);
      border-bottom: 3px solid var(--ink);
      border-radius: 0 0 8px 0;
      z-index: 3;
    }

    .mouth::before {
      content: "";
      position: absolute;
      left: -11px;
      top: 0;
      width: 12px;
      height: 10px;
      border-left: 3px solid var(--ink);
      border-bottom: 3px solid var(--ink);
      border-radius: 0 0 0 8px;
    }

    .glasses {
      position: absolute;
      left: 25px;
      top: 20px;
      width: 66px;
      height: 28px;
      z-index: 4;
    }

    .glasses::before,
    .glasses::after {
      content: "";
      position: absolute;
      top: 0;
      width: 27px;
      height: 27px;
      border: 4px solid var(--outline);
      border-radius: 50%;
      background: rgb(255 255 255 / 16%);
    }

    .glasses::before {
      left: 0;
    }

    .glasses::after {
      right: 0;
    }

    .bridge {
      position: absolute;
      left: 29px;
      top: 13px;
      width: 14px;
      height: 4px;
      background: var(--outline);
    }

    .shine {
      position: absolute;
      width: 14px;
      height: 7px;
      background: rgb(255 255 255 / 82%);
      clip-path: polygon(0 0, 100% 0, 72% 100%, 18% 100%);
      z-index: 5;
    }

    .shine.one {
      left: 47px;
      top: 22px;
    }

    .shine.two {
      left: 80px;
      top: 25px;
      width: 11px;
      height: 6px;
    }

    .paw {
      position: absolute;
      bottom: 0;
      width: 30px;
      height: 28px;
      border: 5px solid var(--outline);
      border-radius: 12px 12px 16px 16px;
      background: var(--fox);
      z-index: 3;
    }

    .paw::before {
      content: "";
      position: absolute;
      left: 6px;
      top: 5px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--cream);
      box-shadow: 8px 2px 0 var(--cream), 4px 10px 0 var(--cream);
    }

    .paw.left {
      left: 36px;
      transform: rotate(-8deg);
    }

    .paw.right {
      right: 36px;
      transform: rotate(8deg);
    }

    .thought-cloud {
      position: absolute;
      left: 103px;
      top: 2px;
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
      right: 10px;
      top: 18px;
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

    body[data-state="typing"] .body::before,
    body[data-state="typing"] .body::after {
      animation: sleeve-tap 0.34s ease-in-out infinite;
    }

    body[data-state="thinking"] .fox {
      animation: head-tilt 1.6s ease-in-out infinite;
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
      top: 33px;
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

    @keyframes sleeve-tap {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(4px);
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
<body data-state="${this.state}">
  <main class="shell">
    <section class="stage" aria-label="DocFox companion">
      <div class="fox" role="img" aria-label="A small fox waiting in the sidebar">
        <div class="thought-cloud" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        <div class="zzz" aria-hidden="true">Zzz</div>
        <div class="tail"></div>
        <div class="ear left"></div>
        <div class="ear right"></div>
        <div class="hood"></div>
        <div class="body"></div>
        <div class="head">
          <div class="cheek left"></div>
          <div class="cheek right"></div>
          <div class="shine one"></div>
          <div class="shine two"></div>
          <div class="glasses"><div class="bridge"></div></div>
          <div class="eye left"></div>
          <div class="eye right"></div>
          <div class="nose"></div>
          <div class="mouth"></div>
        </div>
        <div class="paw left"></div>
        <div class="paw right"></div>
      </div>
    </section>
    <section class="status" aria-live="polite">
      <h1 class="name">DocFox</h1>
      <p class="mood">${getDocFoxStateLabel(this.state)}</p>
    </section>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const labels = ${JSON.stringify({
      idle: getDocFoxStateLabel('idle'),
      typing: getDocFoxStateLabel('typing'),
      thinking: getDocFoxStateLabel('thinking'),
      sleeping: getDocFoxStateLabel('sleeping'),
      happy: getDocFoxStateLabel('happy'),
    })};
    const mood = document.querySelector('.mood');

    function setState(state) {
      document.body.dataset.state = state;
      if (mood) {
        mood.textContent = labels[state] || labels.idle;
      }
      vscode.setState({ state });
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'setState') {
        setState(message.state);
      }
    });

    setState('${this.state}');
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
