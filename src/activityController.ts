import * as vscode from 'vscode';

import { BuddyStateManager } from './stateManager';

const thinkingDelayMs = 1000;
const searchingDelayMs = 1400;
const sleepingDelayMs = 5500;
const happyDelayMs = 2600;

export class BuddyActivityController implements vscode.Disposable {
  private thinkingTimer?: ReturnType<typeof setTimeout>;
  private sleepingTimer?: ReturnType<typeof setTimeout>;
  private happyTimer?: ReturnType<typeof setTimeout>;
  private readonly subscriptions: vscode.Disposable[] = [];

  public constructor(private readonly stateManager: BuddyStateManager) {
    this.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (isMarkdownDocument(event.document)) {
          this.handleTyping();
        }
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (isMarkdownDocument(document)) {
          this.handleSave();
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (isNavigableDocument(event.textEditor.document) && event.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
          this.handleSearching();
        }
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        if (isNavigableDocument(event.textEditor.document)) {
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
    this.scheduleIdleSleep();
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

  private handleSave(): void {
    this.clearTimers();
    this.stateManager.setState('happy');

    this.happyTimer = setTimeout(() => {
      if (this.stateManager.state !== 'happy') {
        return;
      }

      if (hasActiveMarkdownErrors()) {
        this.setPanic();
      } else {
        this.setIdle();
      }
    }, happyDelayMs);
  }

  private updatePanicState(): void {
    if (hasActiveMarkdownErrors()) {
      this.setPanic();
    } else if (this.stateManager.state === 'panic') {
      this.clearTimers();
      this.setIdle();
    } else if (this.stateManager.state === 'idle') {
      this.scheduleIdleSleep();
    }
  }

  private setPanic(): void {
    this.clearTimers();
    this.stateManager.setState('panic');
  }

  private setIdle(): void {
    this.stateManager.setState('idle');
    this.scheduleIdleSleep();
  }

  private scheduleThinking(delayMs: number): void {
    this.thinkingTimer = setTimeout(() => {
      this.stateManager.setState('thinking');

      this.sleepingTimer = setTimeout(() => {
        this.stateManager.setState('sleeping');
      }, sleepingDelayMs);
    }, delayMs);
  }

  private scheduleIdleSleep(): void {
    if (this.sleepingTimer || this.stateManager.state !== 'idle') {
      return;
    }

    this.sleepingTimer = setTimeout(() => {
      if (this.stateManager.state === 'idle') {
        this.stateManager.setState('sleeping');
      }
    }, sleepingDelayMs);
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

    if (this.happyTimer) {
      clearTimeout(this.happyTimer);
      this.happyTimer = undefined;
    }
  }
}

function isMarkdownDocument(document: vscode.TextDocument): boolean {
  return document.languageId === 'markdown' || document.fileName.toLowerCase().endsWith('.md');
}

function isNavigableDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === 'file' || document.uri.scheme === 'untitled';
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
