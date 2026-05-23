import * as vscode from 'vscode';

export class DocFoxProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'docfox.companion';

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);
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
    }

    .fox {
      position: relative;
      width: 148px;
      height: 136px;
      animation: breathe 2.8s ease-in-out infinite;
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
  </style>
</head>
<body>
  <main class="shell">
    <section class="stage" aria-label="DocFox companion">
      <div class="fox" role="img" aria-label="A small fox waiting in the sidebar">
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
      <p class="mood">Ready for Markdown.</p>
    </section>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    vscode.setState({ state: 'idle' });
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
