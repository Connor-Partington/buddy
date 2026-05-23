import * as vscode from 'vscode';

import { DocFoxStateManager } from './stateManager';

const thinkingDelayMs = 1000;
const searchingDelayMs = 1400;
const sleepingDelayMs = 5500;

export class DocFoxActivityController implements vscode.Disposable {
  private thinkingTimer?: ReturnType<typeof setTimeout>;
  private sleepingTimer?: ReturnType<typeof setTimeout>;
  private readonly subscriptions: vscode.Disposable[] = [];

  public constructor(private readonly stateManager: DocFoxStateManager) {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (isMarkdownDocument(event.document)) {
          this.handleTyping();
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (isMarkdownDocument(event.textEditor.document) && event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
          this.handleSearching();
        }
      }),
      vscode.languages.onDidChangeDiagnostics(() => {
        this.updatePanicState();
      }),
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updatePanicState();
      }),
    );

    this.updatePanicState();
  }

  public dispose(): void {
    this.clearTimers();
    this.subscriptions.forEach((subscription) => subscription.dispose());
  }

  private handleTyping(): void {
    if (hasActiveMarkdownErrors()) {
      this.setPanic();
      return;
    }

    this.clearTimers();
    this.stateManager.setState('typing');
    this.scheduleThinking(thinkingDelayMs);
  }

  private handleSearching(): void {
    if (this.stateManager.state === 'typing') {
      return;
    }

    if (hasActiveMarkdownErrors()) {
      this.setPanic();
      return;
    }

    this.clearTimers();
    this.stateManager.setState('searching');
    this.scheduleThinking(searchingDelayMs);
  }

  private updatePanicState(): void {
    if (hasActiveMarkdownErrors()) {
      this.setPanic();
    } else if (this.stateManager.state === 'panic') {
      this.clearTimers();
      this.stateManager.setState('idle');
    }
  }

  private setPanic(): void {
    this.clearTimers();
    this.stateManager.setState('panic');
  }

  private scheduleThinking(delayMs: number): void {
    this.thinkingTimer = setTimeout(() => {
      this.stateManager.setState('thinking');

      this.sleepingTimer = setTimeout(() => {
        this.stateManager.setState('sleeping');
      }, sleepingDelayMs);
    }, delayMs);
  }

  private clearTimers(): void {
    if (this.thinkingTimer) {
      clearTimeout(this.thinkingTimer);
      this.thinkingTimer = undefined;
    }

    if (this.sleepingTimer) {
      clearTimeout(this.sleepingTimer);
      this.sleepingTimer = undefined;
    }
  }
}

function isMarkdownDocument(document: vscode.TextDocument): boolean {
  return document.languageId === 'markdown' || document.fileName.toLowerCase().endsWith('.md');
}

function hasActiveMarkdownErrors(): boolean {
  const activeDocument = vscode.window.activeTextEditor?.document;
  if (!activeDocument || !isMarkdownDocument(activeDocument)) {
    return false;
  }

  return vscode.languages
    .getDiagnostics(activeDocument.uri)
    .some((diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error);
}
