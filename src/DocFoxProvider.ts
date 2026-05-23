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
  </style>
</head>
<body data-state="${this.state}">
  <main class="shell">
    <section class="stage" aria-label="DocFox companion">
      <div class="fox" role="img" aria-label="A small fox waiting in the sidebar">
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
